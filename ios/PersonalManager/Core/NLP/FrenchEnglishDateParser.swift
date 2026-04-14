import Foundation

/// A pragmatic natural-language date parser for FR + EN, used by QuickAdd.
///
/// The goal is NOT to be exhaustive — `NSDataDetector` already handles many English
/// dates. We specifically plug the gaps for French ("vendredi prochain", "dans 3 jours")
/// and for the Todoist-style shorthand users expect ("tomorrow 10am", "demain 10h").
///
/// Returned tuple:
///   - `remaining`: the input with the matched date expression stripped out (becomes the task title)
///   - `date`: the resolved Date in the user's current timezone
///   - `hasTime`: true if a time-of-day component was present
public struct FrenchEnglishDateParser: Sendable {
    public struct Result: Sendable, Equatable {
        public let remaining: String
        public let date: Date
        public let hasTime: Bool
    }

    public init() {}

    public func parse(_ input: String, now: Date = .now, calendar: Calendar = .current) -> Result? {
        let trimmed = input.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return nil }

        // Try each strategy; first match wins. Order matters — more specific patterns first.
        let strategies: [(String, Date, Calendar) -> Result?] = [
            relativeDaysFR, relativeDaysEN,
            keywordsFR, keywordsEN,
            weekdayFR, weekdayEN,
            inNDaysFR, inNDaysEN,
            dataDetectorEN
        ]
        for strategy in strategies {
            if let hit = strategy(trimmed, now, calendar) {
                return hit
            }
        }
        return nil
    }

    // MARK: - Strategies

    private func relativeDaysFR(_ input: String, now: Date, cal: Calendar) -> Result? {
        // "aujourd'hui", "demain", "après-demain" + optional "à HHh[MM]"
        let pattern = #"(?i)\b(aujourd['’]?hui|demain|apr[eè]s[- ]demain)\b(?:\s+(?:[àa]\s*)?(\d{1,2})(?:[h:](\d{1,2}))?\b)?"#
        guard let (range, groups) = firstMatch(pattern, in: input) else { return nil }
        let word = groups[1].lowercased()
        let offset = word.contains("après") || word.contains("apres") ? 2 : (word.starts(with: "demain") ? 1 : 0)
        let base = cal.date(byAdding: .day, value: offset, to: cal.startOfDay(for: now)) ?? now
        let (date, hasTime) = applyOptionalTime(base, hour: groups[2], minute: groups[3], calendar: cal)
        return Result(remaining: stripped(input, range: range), date: date, hasTime: hasTime)
    }

    private func relativeDaysEN(_ input: String, now: Date, cal: Calendar) -> Result? {
        // "today", "tomorrow", "the day after tomorrow" + optional "10am" / "10:30" / "10h"
        let pattern = #"(?i)\b(today|tomorrow|the day after tomorrow)\b(?:\s+(?:at\s+)?(\d{1,2})(?:[:h](\d{1,2}))?\s*(am|pm)?)?"#
        guard let (range, groups) = firstMatch(pattern, in: input) else { return nil }
        let word = groups[1].lowercased()
        let offset: Int
        switch word {
        case "today": offset = 0
        case "tomorrow": offset = 1
        default: offset = 2
        }
        let base = cal.date(byAdding: .day, value: offset, to: cal.startOfDay(for: now)) ?? now
        let (date, hasTime) = applyOptionalTime(base, hour: groups[2], minute: groups[3], ampm: groups[4], calendar: cal)
        return Result(remaining: stripped(input, range: range), date: date, hasTime: hasTime)
    }

    private func keywordsFR(_ input: String, now: Date, cal: Calendar) -> Result? {
        let pattern = #"(?i)\b(ce\s+soir|ce\s+matin|ce\s+midi|ce\s+week[- ]?end|la\s+semaine\s+prochaine|la\s+prochaine\s+semaine)\b"#
        guard let (range, groups) = firstMatch(pattern, in: input) else { return nil }
        let phrase = groups[1].lowercased().replacingOccurrences(of: "-", with: " ")
        let base: Date
        var hasTime = false
        switch phrase {
        case let p where p.contains("soir"):
            base = cal.date(bySettingHour: 19, minute: 0, second: 0, of: cal.startOfDay(for: now)) ?? now; hasTime = true
        case let p where p.contains("matin"):
            base = cal.date(bySettingHour: 9, minute: 0, second: 0, of: cal.startOfDay(for: now)) ?? now; hasTime = true
        case let p where p.contains("midi"):
            base = cal.date(bySettingHour: 12, minute: 0, second: 0, of: cal.startOfDay(for: now)) ?? now; hasTime = true
        case let p where p.contains("week end") || p.contains("weekend"):
            base = nextWeekday(7, after: now, calendar: cal)
        case let p where p.contains("semaine prochaine") || p.contains("prochaine semaine"):
            base = nextWeekday(2, after: now, calendar: cal)
        default:
            return nil
        }
        return Result(remaining: stripped(input, range: range), date: base, hasTime: hasTime)
    }

    private func keywordsEN(_ input: String, now: Date, cal: Calendar) -> Result? {
        let pattern = #"(?i)\b(tonight|this morning|this afternoon|next week|this weekend)\b"#
        guard let (range, groups) = firstMatch(pattern, in: input) else { return nil }
        let phrase = groups[1].lowercased()
        let base: Date
        var hasTime = false
        switch phrase {
        case "tonight":
            base = cal.date(bySettingHour: 19, minute: 0, second: 0, of: cal.startOfDay(for: now)) ?? now; hasTime = true
        case "this morning":
            base = cal.date(bySettingHour: 9, minute: 0, second: 0, of: cal.startOfDay(for: now)) ?? now; hasTime = true
        case "this afternoon":
            base = cal.date(bySettingHour: 14, minute: 0, second: 0, of: cal.startOfDay(for: now)) ?? now; hasTime = true
        case "next week":
            base = nextWeekday(2, after: now, calendar: cal)
        case "this weekend":
            base = nextWeekday(7, after: now, calendar: cal)
        default: return nil
        }
        return Result(remaining: stripped(input, range: range), date: base, hasTime: hasTime)
    }

    private func weekdayFR(_ input: String, now: Date, cal: Calendar) -> Result? {
        let names = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"]
        let joined = names.joined(separator: "|")
        let pattern = #"(?i)\b(\#(joined))(?:\s+(prochain(?:e)?))?\b(?:\s+(?:[àa]\s*)?(\d{1,2})(?:[h:](\d{1,2}))?)?"#
        guard let (range, groups) = firstMatch(pattern, in: input) else { return nil }
        let dayName = groups[1].lowercased()
        guard let idx = names.firstIndex(of: dayName) else { return nil }
        let weekday = idx + 1    // Calendar weekdays are 1..7 with Sunday = 1
        let isNext = !groups[2].isEmpty
        var base = nextWeekday(weekday, after: now, calendar: cal)
        if isNext, cal.isDate(base, inSameDayAs: now) {
            base = cal.date(byAdding: .day, value: 7, to: base) ?? base
        }
        let (date, hasTime) = applyOptionalTime(base, hour: groups[3], minute: groups[4], calendar: cal)
        return Result(remaining: stripped(input, range: range), date: date, hasTime: hasTime)
    }

    private func weekdayEN(_ input: String, now: Date, cal: Calendar) -> Result? {
        let names = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
        let joined = names.joined(separator: "|")
        let pattern = #"(?i)(?:\bnext\s+)?\b(\#(joined))\b(?:\s+(?:at\s+)?(\d{1,2})(?:[:h](\d{1,2}))?\s*(am|pm)?)?"#
        guard let (range, groups) = firstMatch(pattern, in: input) else { return nil }
        let dayName = groups[1].lowercased()
        guard let idx = names.firstIndex(of: dayName) else { return nil }
        let weekday = idx + 1
        let isNext = input.range(of: #"(?i)\bnext\s+\#(dayName)\b"#, options: .regularExpression) != nil
        var base = nextWeekday(weekday, after: now, calendar: cal)
        if isNext, cal.isDate(base, inSameDayAs: now) {
            base = cal.date(byAdding: .day, value: 7, to: base) ?? base
        }
        let (date, hasTime) = applyOptionalTime(base, hour: groups[2], minute: groups[3], ampm: groups[4], calendar: cal)
        return Result(remaining: stripped(input, range: range), date: date, hasTime: hasTime)
    }

    private func inNDaysFR(_ input: String, now: Date, cal: Calendar) -> Result? {
        let pattern = #"(?i)\bdans\s+(\d+)\s+(jour|jours|semaine|semaines|mois)\b"#
        guard let (range, groups) = firstMatch(pattern, in: input) else { return nil }
        let n = Int(groups[1]) ?? 1
        let unit = groups[2].lowercased()
        let component: Calendar.Component
        if unit.hasPrefix("semaine") { component = .weekOfYear }
        else if unit.hasPrefix("mois") { component = .month }
        else { component = .day }
        let base = cal.date(byAdding: component, value: n, to: cal.startOfDay(for: now)) ?? now
        return Result(remaining: stripped(input, range: range), date: base, hasTime: false)
    }

    private func inNDaysEN(_ input: String, now: Date, cal: Calendar) -> Result? {
        let pattern = #"(?i)\bin\s+(\d+)\s+(day|days|week|weeks|month|months|hour|hours)\b"#
        guard let (range, groups) = firstMatch(pattern, in: input) else { return nil }
        let n = Int(groups[1]) ?? 1
        let unit = groups[2].lowercased()
        let component: Calendar.Component
        var hasTime = false
        switch unit {
        case "day", "days":     component = .day
        case "week", "weeks":   component = .weekOfYear
        case "month", "months": component = .month
        case "hour", "hours":   component = .hour; hasTime = true
        default: return nil
        }
        let base = cal.date(byAdding: component, value: n, to: hasTime ? now : cal.startOfDay(for: now)) ?? now
        return Result(remaining: stripped(input, range: range), date: base, hasTime: hasTime)
    }

    private func dataDetectorEN(_ input: String, now: Date, cal: Calendar) -> Result? {
        guard let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.date.rawValue) else { return nil }
        let range = NSRange(input.startIndex..., in: input)
        guard let match = detector.firstMatch(in: input, options: [], range: range),
              let swiftRange = Range(match.range, in: input),
              let date = match.date else { return nil }
        let matched = String(input[swiftRange]).lowercased()
        let hasTime = matched.contains(":") || matched.contains("am") || matched.contains("pm")
            || (matched.range(of: #"\dh\d"#, options: .regularExpression) != nil)
        return Result(remaining: stripped(input, range: swiftRange), date: date, hasTime: hasTime)
    }

    // MARK: - Helpers

    private func applyOptionalTime(
        _ base: Date,
        hour: String,
        minute: String,
        ampm: String = "",
        calendar cal: Calendar
    ) -> (Date, Bool) {
        guard !hour.isEmpty, let h = Int(hour) else {
            return (base, false)
        }
        var hh = h
        let am = ampm.lowercased()
        if am == "pm" && hh < 12 { hh += 12 }
        if am == "am" && hh == 12 { hh = 0 }
        let mm = minute.isEmpty ? 0 : (Int(minute) ?? 0)
        let out = cal.date(bySettingHour: hh, minute: mm, second: 0, of: base) ?? base
        return (out, true)
    }

    private func stripped(_ input: String, range: Range<String.Index>) -> String {
        var out = input
        out.removeSubrange(range)
        return out
            .replacingOccurrences(of: "  ", with: " ")
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .trimmingCharacters(in: .punctuationCharacters)
            .trimmingCharacters(in: .whitespacesAndNewlines)
    }
}

// MARK: - Regex helpers

/// Returns (full-range, capture-groups) where each group is `""` if not matched.
/// This keeps call sites tidy: `groups[1]` is always a `String`.
private func firstMatch(_ pattern: String, in text: String) -> (Range<String.Index>, [String])? {
    guard let regex = try? NSRegularExpression(pattern: pattern) else { return nil }
    let range = NSRange(text.startIndex..., in: text)
    guard let match = regex.firstMatch(in: text, options: [], range: range),
          let fullRange = Range(match.range, in: text) else { return nil }
    var groups: [String] = [String(text[fullRange])]
    for i in 1..<match.numberOfRanges {
        if let r = Range(match.range(at: i), in: text) {
            groups.append(String(text[r]))
        } else {
            groups.append("")
        }
    }
    return (fullRange, groups)
}

private func nextWeekday(_ weekday: Int, after: Date, calendar cal: Calendar) -> Date {
    var comps = DateComponents(); comps.weekday = weekday
    return cal.nextDate(
        after: cal.startOfDay(for: after),
        matching: comps,
        matchingPolicy: .nextTime,
        direction: .forward
    ) ?? after
}

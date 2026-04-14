import XCTest
@testable import PersonalManager

final class FrenchEnglishDateParserTests: XCTestCase {

    private let parser = FrenchEnglishDateParser()
    private var cal: Calendar!
    private var fixedNow: Date!

    override func setUp() {
        super.setUp()
        cal = Calendar(identifier: .gregorian)
        cal.timeZone = TimeZone(identifier: "America/Toronto")!
        var comps = DateComponents()
        // Wednesday, May 14, 2025 09:00 local.
        comps.year = 2025; comps.month = 5; comps.day = 14
        comps.hour = 9; comps.minute = 0
        comps.timeZone = cal.timeZone
        fixedNow = cal.date(from: comps)!
    }

    // MARK: - French

    func testDemain() {
        let r = parser.parse("Appeler le dentiste demain", now: fixedNow, calendar: cal)
        XCTAssertEqual(r?.remaining, "Appeler le dentiste")
        XCTAssertFalse(r!.hasTime)
        XCTAssertEqual(daysBetween(fixedNow, r!.date), 1)
    }

    func testDemain10h() {
        let r = parser.parse("acheter du pain demain 10h", now: fixedNow, calendar: cal)!
        XCTAssertTrue(r.hasTime)
        let comps = cal.dateComponents([.hour, .minute], from: r.date)
        XCTAssertEqual(comps.hour, 10)
        XCTAssertEqual(comps.minute, 0)
    }

    func testAprèsDemain() {
        let r = parser.parse("rdv après-demain", now: fixedNow, calendar: cal)!
        XCTAssertEqual(daysBetween(fixedNow, r.date), 2)
    }

    func testCeSoir() {
        let r = parser.parse("préparer le souper ce soir", now: fixedNow, calendar: cal)!
        XCTAssertTrue(r.hasTime)
        XCTAssertEqual(cal.component(.hour, from: r.date), 19)
    }

    func testVendrediProchain() {
        let r = parser.parse("lunch vendredi prochain", now: fixedNow, calendar: cal)!
        // Wed May 14 -> next Fri is May 16 (same week). "prochain" forces +7, so May 23.
        let target = cal.date(from: DateComponents(year: 2025, month: 5, day: 23))!
        XCTAssertTrue(cal.isDate(r.date, inSameDayAs: target))
    }

    func testDans3Jours() {
        let r = parser.parse("relancer dans 3 jours", now: fixedNow, calendar: cal)!
        XCTAssertEqual(daysBetween(fixedNow, r.date), 3)
    }

    func testLundiÀ15h() {
        let r = parser.parse("réunion lundi à 15h", now: fixedNow, calendar: cal)!
        XCTAssertTrue(r.hasTime)
        XCTAssertEqual(cal.component(.hour, from: r.date), 15)
        XCTAssertEqual(cal.component(.weekday, from: r.date), 2) // Monday
    }

    // MARK: - English

    func testTomorrow() {
        let r = parser.parse("buy bread tomorrow", now: fixedNow, calendar: cal)!
        XCTAssertEqual(r.remaining, "buy bread")
        XCTAssertEqual(daysBetween(fixedNow, r.date), 1)
    }

    func testTomorrow10am() {
        let r = parser.parse("call dentist tomorrow 10am", now: fixedNow, calendar: cal)!
        XCTAssertTrue(r.hasTime)
        XCTAssertEqual(cal.component(.hour, from: r.date), 10)
    }

    func testTonight() {
        let r = parser.parse("watch the game tonight", now: fixedNow, calendar: cal)!
        XCTAssertTrue(r.hasTime)
        XCTAssertEqual(cal.component(.hour, from: r.date), 19)
    }

    func testIn3Days() {
        let r = parser.parse("follow up in 3 days", now: fixedNow, calendar: cal)!
        XCTAssertEqual(daysBetween(fixedNow, r.date), 3)
    }

    func testNextMonday() {
        let r = parser.parse("gym next monday", now: fixedNow, calendar: cal)!
        // Wed May 14 -> Mon May 19 is next. "next" forces +7, so May 26.
        let target = cal.date(from: DateComponents(year: 2025, month: 5, day: 26))!
        XCTAssertTrue(cal.isDate(r.date, inSameDayAs: target))
    }

    func testNoDate() {
        let r = parser.parse("reorganize my life", now: fixedNow, calendar: cal)
        XCTAssertNil(r)
    }

    // MARK: - Helpers

    private func daysBetween(_ a: Date, _ b: Date) -> Int {
        cal.dateComponents([.day], from: cal.startOfDay(for: a), to: cal.startOfDay(for: b)).day ?? 0
    }
}

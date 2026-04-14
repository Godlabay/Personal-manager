import Foundation

/// Shared decode helper. Decodes a JSON string using an ISO-8601 date strategy that accepts
/// both "2025-05-20T14:00:00Z" and "2025-05-20".
func decodeArgs<T: Decodable>(_ type: T.Type, json: String) throws -> T {
    let data = Data(json.utf8)
    let decoder = JSONDecoder()
    decoder.dateDecodingStrategy = .custom { dec in
        let c = try dec.singleValueContainer()
        let s = try c.decode(String.self)
        if let d = ToolDateFormats.iso8601WithFraction.date(from: s) { return d }
        if let d = ToolDateFormats.iso8601.date(from: s)              { return d }
        if let d = ToolDateFormats.dateOnly.date(from: s)             { return d }
        throw DecodingError.dataCorruptedError(in: c, debugDescription: "Unrecognized date: \(s)")
    }
    return try decoder.decode(T.self, from: data)
}

enum ToolDateFormats {
    static let iso8601WithFraction: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f
    }()
    static let iso8601: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime]
        return f
    }()
    static let dateOnly: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        f.timeZone = TimeZone.current
        return f
    }()
}

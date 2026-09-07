import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/booking_model.dart';

class ApiService {
  // Points to the live Apex INN production backend on Vercel
  static const String baseUrl = 'https://apex-inn.vercel.app/api';

  static const List<String> availableSources = [
    'GOMMT',
    'B.COM',
    'AIRBNB',
    'BREVISTAY',
    'B2B',
    'CLEARTRIP',
    'YATRA',
    'EXPEDIA',
    'AGODA',
    'Fab',
    'Corporate',
    'Walk inn',
  ];

  static const List<String> roomCategories = [
    'Standard Room',
    'Deluxe Room',
    'Super Deluxe',
    'Executive Suite',
    'Family Suite',
  ];

  Future<List<Booking>> fetchBookings({String? query, String? status, String? source}) async {
    try {
      final uri = Uri.parse('$baseUrl/bookings');
      final response = await http.get(uri);

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final List<dynamic> list = data['bookings'] ?? [];
        List<Booking> bookings = list.map((item) => Booking.fromJson(item)).toList();

        // Apply client filters if provided
        if (query != null && query.isNotEmpty) {
          final q = query.toLowerCase();
          bookings = bookings.where((b) =>
            b.guestName.toLowerCase().contains(q) ||
            b.bookingNumber.toLowerCase().contains(q) ||
            b.guestPhone.contains(q)
          ).toList();
        }
        if (status != null && status != 'ALL') {
          bookings = bookings.where((b) => b.status == status).toList();
        }
        if (source != null && source != 'ALL') {
          bookings = bookings.where((b) => b.source == source).toList();
        }
        return bookings;
      } else {
        throw Exception('Failed to load bookings: ${response.statusCode}');
      }
    } catch (e) {
      rethrow;
    }
  }

  Future<Map<String, dynamic>> createBooking(Map<String, dynamic> bookingData) async {
    final response = await http.post(
      Uri.parse('$baseUrl/bookings'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode(bookingData),
    );

    if (response.statusCode == 200 || response.statusCode == 201) {
      return json.decode(response.body);
    } else {
      final error = json.decode(response.body);
      throw Exception(error['error'] ?? 'Failed to create booking');
    }
  }

  Future<bool> collectPayment({
    required String bookingId,
    required double amount,
    required String method,
    String? note,
  }) async {
    final response = await http.post(
      Uri.parse('$baseUrl/bookings/$bookingId/payment'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode({
        'amount': amount,
        'method': method, // 'UPI', 'CASH', 'CARD'
        'note': note,
      }),
    );

    return response.statusCode == 200;
  }

  Future<bool> checkInGuest(String bookingId) async {
    final response = await http.post(
      Uri.parse('$baseUrl/bookings/$bookingId/checkin'),
      headers: {'Content-Type': 'application/json'},
    );
    return response.statusCode == 200;
  }

  Future<bool> checkOutGuest(String bookingId, {String? paymentMethod, double? settledAmount}) async {
    final response = await http.post(
      Uri.parse('$baseUrl/bookings/$bookingId/checkout'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode({
        'paymentMethod': paymentMethod ?? 'CASH',
        'settledAmount': settledAmount,
      }),
    );
    return response.statusCode == 200;
  }

  Future<List<dynamic>> fetchRooms() async {
    final response = await http.get(Uri.parse('$baseUrl/rooms'));
    if (response.statusCode == 200) {
      final data = json.decode(response.body);
      return data['rooms'] ?? [];
    }
    return [];
  }
}

import 'package:flutter/foundation.dart';
import '../models/booking_model.dart';
import '../services/api_service.dart';

class BookingProvider with ChangeNotifier {
  final ApiService _apiService = ApiService();

  List<Booking> _bookings = [];
  bool _isLoading = false;
  String? _errorMessage;
  String _selectedFilter = 'ALL';
  String _selectedSource = 'ALL';
  String _searchQuery = '';

  List<Booking> get bookings => _bookings;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  String get selectedFilter => _selectedFilter;
  String get selectedSource => _selectedSource;
  String get searchQuery => _searchQuery;

  // Stats computed live
  int get totalBookings => _bookings.length;
  int get activeGuests => _bookings.where((b) => b.status == 'CHECKED_IN').length;
  int get confirmedUpcoming => _bookings.where((b) => b.status == 'CONFIRMED').length;
  double get totalRevenue => _bookings.fold(0.0, (acc, b) => acc + b.paidAmount);

  Future<void> loadBookings() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      _bookings = await _apiService.fetchBookings(
        query: _searchQuery,
        status: _selectedFilter,
        source: _selectedSource,
      );
    } catch (e) {
      _errorMessage = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  void setFilter(String filter) {
    _selectedFilter = filter;
    loadBookings();
  }

  void setSource(String source) {
    _selectedSource = source;
    loadBookings();
  }

  void setSearchQuery(String query) {
    _searchQuery = query;
    loadBookings();
  }

  Future<bool> createNewReservation(Map<String, dynamic> data) async {
    try {
      await _apiService.createBooking(data);
      await loadBookings();
      return true;
    } catch (e) {
      _errorMessage = e.toString();
      notifyListeners();
      return false;
    }
  }

  Future<bool> recordPayment(String bookingId, double amount, String method) async {
    final success = await _apiService.collectPayment(
      bookingId: bookingId,
      amount: amount,
      method: method,
    );
    if (success) {
      await loadBookings();
    }
    return success;
  }
}

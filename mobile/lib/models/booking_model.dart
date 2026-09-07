class RoomCategorySelection {
  final String category;
  final int count;
  final double ratePerRoom;

  RoomCategorySelection({
    required this.category,
    required this.count,
    required this.ratePerRoom,
  });

  Map<String, dynamic> toJson() => {
    'category': category,
    'count': count,
    'ratePerRoom': ratePerRoom,
  };

  factory RoomCategorySelection.fromJson(Map<String, dynamic> json) {
    return RoomCategorySelection(
      category: json['category'] ?? '',
      count: json['count'] ?? 1,
      ratePerRoom: (json['ratePerRoom'] as num?)?.toDouble() ?? 0.0,
    );
  }
}

class Booking {
  final String id;
  final String bookingNumber;
  final String guestName;
  final String guestPhone;
  final String? guestEmail;
  final String? guestIdType;
  final String? guestIdNumber;
  final DateTime checkIn;
  final DateTime checkOut;
  final String source;
  final String status;
  final double roomTotal;
  final double addOnsTotal;
  final double totalAmount;
  final double paidAmount;
  final double balanceAmount;
  final String paymentStatus;
  final String? notes;
  final List<String> roomNumbers;
  final List<RoomCategorySelection> roomSelections;
  final Map<String, dynamic>? addOns;
  final List<dynamic>? payments;

  Booking({
    required this.id,
    required this.bookingNumber,
    required this.guestName,
    required this.guestPhone,
    this.guestEmail,
    this.guestIdType,
    this.guestIdNumber,
    required this.checkIn,
    required this.checkOut,
    required this.source,
    required this.status,
    required this.roomTotal,
    required this.addOnsTotal,
    required this.totalAmount,
    required this.paidAmount,
    required this.balanceAmount,
    required this.paymentStatus,
    this.notes,
    required this.roomNumbers,
    required this.roomSelections,
    this.addOns,
    this.payments,
  });

  bool get isSameDayStay {
    return checkIn.year == checkOut.year &&
        checkIn.month == checkOut.month &&
        checkIn.day == checkOut.day;
  }

  int get durationDays {
    final diff = checkOut.difference(checkIn).inDays;
    return diff <= 0 ? 1 : diff;
  }

  String get durationLabel {
    return isSameDayStay ? 'Same-day (1 Day)' : '$durationDays Nights';
  }

  factory Booking.fromJson(Map<String, dynamic> json) {
    List<String> rooms = [];
    if (json['rooms'] != null && json['rooms'] is List) {
      rooms = (json['rooms'] as List)
          .map((r) => r['room']?['roomNumber']?.toString() ?? '')
          .where((s) => s.isNotEmpty)
          .toList();
    }

    List<RoomCategorySelection> selections = [];
    if (json['roomSelections'] != null && json['roomSelections'] is List) {
      selections = (json['roomSelections'] as List)
          .map((s) => RoomCategorySelection.fromJson(s))
          .toList();
    }

    return Booking(
      id: json['id'] ?? '',
      bookingNumber: json['bookingNumber'] ?? '',
      guestName: json['guestName'] ?? 'Guest',
      guestPhone: json['guestPhone'] ?? '',
      guestEmail: json['guestEmail'],
      guestIdType: json['guestIdType'],
      guestIdNumber: json['guestIdNumber'],
      checkIn: DateTime.tryParse(json['checkIn'] ?? '') ?? DateTime.now(),
      checkOut: DateTime.tryParse(json['checkOut'] ?? '') ?? DateTime.now(),
      source: json['source'] ?? 'Walk inn',
      status: json['status'] ?? 'CONFIRMED',
      roomTotal: (json['roomTotal'] as num?)?.toDouble() ?? 0.0,
      addOnsTotal: (json['addOnsTotal'] as num?)?.toDouble() ?? 0.0,
      totalAmount: (json['totalAmount'] as num?)?.toDouble() ?? 0.0,
      paidAmount: (json['paidAmount'] as num?)?.toDouble() ?? 0.0,
      balanceAmount: (json['balanceAmount'] as num?)?.toDouble() ?? 0.0,
      paymentStatus: json['paymentStatus'] ?? 'PENDING',
      notes: json['notes'],
      roomNumbers: rooms,
      roomSelections: selections,
      addOns: json['addOns'] is Map ? json['addOns'] : null,
      payments: json['payments'] as List<dynamic>?,
    );
  }
}

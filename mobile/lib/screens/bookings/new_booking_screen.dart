import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../models/booking_model.dart';
import '../../providers/booking_provider.dart';
import '../../services/api_service.dart';

class NewBookingScreen extends StatefulWidget {
  const NewBookingScreen({super.key});

  @override
  State<NewBookingScreen> createState() => _NewBookingScreenState();
}

class _NewBookingScreenState extends State<NewBookingScreen> {
  final _formKey = GlobalKey<FormState>();

  // Guest fields
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _emailController = TextEditingController();
  final _idNumberController = TextEditingController();
  final String _idType = 'AADHAAR';
  String _source = 'Walk inn';

  // Dates
  DateTime _checkInDate = DateTime.now();
  DateTime _checkOutDate = DateTime.now().add(const Duration(days: 1));
  bool _isSameDayStay = false;

  // Multi-room category selections
  final List<RoomCategorySelection> _roomSelections = [
    RoomCategorySelection(category: 'Deluxe Room', count: 1, ratePerRoom: 2500),
  ];

  // Add-ons
  bool _hasEarlyCheckIn = false;
  final _earlyCheckInAmt = TextEditingController(text: '500');

  bool _hasLateCheckout = false;
  final _lateCheckoutAmt = TextEditingController(text: '500');

  bool _hasExtraMattress = false;
  int _mattressCount = 1;
  final _mattressRate = TextEditingController(text: '400');

  bool _isSubmitting = false;

  int get _calculatedDurationDays {
    if (_isSameDayStay) return 1;
    final diff = _checkOutDate.difference(_checkInDate).inDays;
    return diff <= 0 ? 1 : diff;
  }

  double get _roomSubtotal {
    double total = 0;
    for (var sel in _roomSelections) {
      total += (sel.count * sel.ratePerRoom * _calculatedDurationDays);
    }
    return total;
  }

  double get _addOnsSubtotal {
    double total = 0;
    if (_hasEarlyCheckIn) total += double.tryParse(_earlyCheckInAmt.text) ?? 0;
    if (_hasLateCheckout) total += double.tryParse(_lateCheckoutAmt.text) ?? 0;
    if (_hasExtraMattress) {
      final rate = double.tryParse(_mattressRate.text) ?? 0;
      total += (rate * _mattressCount * _calculatedDurationDays);
    }
    return total;
  }

  double get _grandTotal => _roomSubtotal + _addOnsSubtotal;

  void _addRoomSelection() {
    setState(() {
      _roomSelections.add(
        RoomCategorySelection(category: 'Standard Room', count: 1, ratePerRoom: 1800),
      );
    });
  }

  void _removeRoomSelection(int index) {
    if (_roomSelections.length > 1) {
      setState(() {
        _roomSelections.removeAt(index);
      });
    }
  }

  void _submit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSubmitting = true);

    final payload = {
      'guestName': _nameController.text.trim(),
      'guestPhone': _phoneController.text.trim(),
      'guestEmail': _emailController.text.trim().isEmpty ? null : _emailController.text.trim(),
      'guestIdType': _idType,
      'guestIdNumber': _idNumberController.text.trim().isEmpty ? null : _idNumberController.text.trim(),
      'source': _source,
      'checkIn': DateFormat('yyyy-MM-dd').format(_checkInDate),
      'checkOut': DateFormat('yyyy-MM-dd').format(_isSameDayStay ? _checkInDate : _checkOutDate),
      'roomSelections': _roomSelections.map((s) => s.toJson()).toList(),
      'addOns': {
        'earlyCheckIn': _hasEarlyCheckIn,
        'earlyCheckInAmount': _hasEarlyCheckIn ? (double.tryParse(_earlyCheckInAmt.text) ?? 0) : 0,
        'lateCheckout': _hasLateCheckout,
        'lateCheckoutAmount': _hasLateCheckout ? (double.tryParse(_lateCheckoutAmt.text) ?? 0) : 0,
        'extraMattress': _hasExtraMattress,
        'extraMattressCount': _hasExtraMattress ? _mattressCount : 0,
        'extraMattressRate': _hasExtraMattress ? (double.tryParse(_mattressRate.text) ?? 0) : 0,
      },
    };

    final provider = Provider.of<BookingProvider>(context, listen: false);
    final success = await provider.createNewReservation(payload);

    setState(() => _isSubmitting = false);

    if (!mounted) return;

    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Reservation created successfully!')),
      );
      Navigator.pop(context);
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(provider.errorMessage ?? 'Error creating booking')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final currency = NumberFormat.currency(symbol: '₹ ', decimalDigits: 0);

    return Scaffold(
      appBar: AppBar(
        title: const Text('New Reservation'),
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // 1. Guest Information Section
            const Text('Guest Information', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            TextFormField(
              controller: _nameController,
              decoration: const InputDecoration(labelText: 'Guest Full Name *', prefixIcon: Icon(Icons.person)),
              validator: (v) => (v == null || v.trim().isEmpty) ? 'Please enter guest name' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _phoneController,
              keyboardType: TextInputType.phone,
              decoration: const InputDecoration(labelText: 'Phone Number *', prefixIcon: Icon(Icons.phone)),
              validator: (v) => (v == null || v.trim().isEmpty) ? 'Please enter phone number' : null,
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              initialValue: _source,
              decoration: const InputDecoration(labelText: 'Booking Channel / Source', prefixIcon: Icon(Icons.hub)),
              items: ApiService.availableSources.map((s) => DropdownMenuItem(value: s, child: Text(s))).toList(),
              onChanged: (v) => setState(() => _source = v ?? 'Walk inn'),
            ),
            const Divider(height: 32),

            // 2. Stay Dates & Same-day Switch
            const Text('Stay Duration', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            SwitchListTile(
              title: const Text('Same-Day Stay (Day Use)'),
              subtitle: const Text('Check-in and check-out on the same date'),
              value: _isSameDayStay,
              onChanged: (val) {
                setState(() {
                  _isSameDayStay = val;
                  if (val) _checkOutDate = _checkInDate;
                });
              },
            ),
            Row(
              children: [
                Expanded(
                  child: ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: const Text('Check-in Date', style: TextStyle(fontSize: 12)),
                    subtitle: Text(DateFormat('dd MMM yyyy').format(_checkInDate), style: const TextStyle(fontWeight: FontWeight.bold)),
                    trailing: const Icon(Icons.calendar_today, size: 18),
                    onTap: () async {
                      final picked = await showDatePicker(
                        context: context,
                        initialDate: _checkInDate,
                        firstDate: DateTime.now().subtract(const Duration(days: 30)),
                        lastDate: DateTime.now().add(const Duration(days: 365)),
                      );
                      if (picked != null) {
                        setState(() {
                          _checkInDate = picked;
                          if (_isSameDayStay || picked.isAfter(_checkOutDate)) {
                            _checkOutDate = _isSameDayStay ? picked : picked.add(const Duration(days: 1));
                          }
                        });
                      }
                    },
                  ),
                ),
                if (!_isSameDayStay) ...[
                  const SizedBox(width: 12),
                  Expanded(
                    child: ListTile(
                      contentPadding: EdgeInsets.zero,
                      title: const Text('Check-out Date', style: TextStyle(fontSize: 12)),
                      subtitle: Text(DateFormat('dd MMM yyyy').format(_checkOutDate), style: const TextStyle(fontWeight: FontWeight.bold)),
                      trailing: const Icon(Icons.calendar_month, size: 18),
                      onTap: () async {
                        final picked = await showDatePicker(
                          context: context,
                          initialDate: _checkOutDate,
                          firstDate: _checkInDate,
                          lastDate: DateTime.now().add(const Duration(days: 365)),
                        );
                        if (picked != null) {
                          setState(() => _checkOutDate = picked);
                        }
                      },
                    ),
                  ),
                ],
              ],
            ),
            const Divider(height: 32),

            // 3. Multi-Room Categories Selection
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Room Categories', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                TextButton.icon(
                  icon: const Icon(Icons.add_circle_outline, size: 18),
                  label: const Text('Add Room Type'),
                  onPressed: _addRoomSelection,
                ),
              ],
            ),
            ..._roomSelections.asMap().entries.map((entry) {
              final idx = entry.key;
              final sel = entry.value;

              return Card(
                margin: const EdgeInsets.symmetric(vertical: 6),
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: DropdownButtonFormField<String>(
                              initialValue: ApiService.roomCategories.contains(sel.category) ? sel.category : ApiService.roomCategories.first,
                              decoration: const InputDecoration(labelText: 'Room Category', isDense: true),
                              items: ApiService.roomCategories.map((c) => DropdownMenuItem(value: c, child: Text(c))).toList(),
                              onChanged: (v) {
                                setState(() {
                                  _roomSelections[idx] = RoomCategorySelection(
                                    category: v!,
                                    count: sel.count,
                                    ratePerRoom: sel.ratePerRoom,
                                  );
                                });
                              },
                            ),
                          ),
                          if (_roomSelections.length > 1)
                            IconButton(
                              icon: const Icon(Icons.delete_outline, color: Colors.red),
                              onPressed: () => _removeRoomSelection(idx),
                            ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      Row(
                        children: [
                          // Quantity Stepper
                          Row(
                            children: [
                              const Text('Qty: ', style: TextStyle(fontSize: 13)),
                              IconButton(
                                icon: const Icon(Icons.remove_circle_outline, size: 20),
                                onPressed: sel.count > 1 ? () {
                                  setState(() {
                                    _roomSelections[idx] = RoomCategorySelection(
                                      category: sel.category,
                                      count: sel.count - 1,
                                      ratePerRoom: sel.ratePerRoom,
                                    );
                                  });
                                } : null,
                              ),
                              Text('${sel.count}', style: const TextStyle(fontWeight: FontWeight.bold)),
                              IconButton(
                                icon: const Icon(Icons.add_circle_outline, size: 20),
                                onPressed: () {
                                  setState(() {
                                    _roomSelections[idx] = RoomCategorySelection(
                                      category: sel.category,
                                      count: sel.count + 1,
                                      ratePerRoom: sel.ratePerRoom,
                                    );
                                  });
                                },
                              ),
                            ],
                          ),
                          const Spacer(),
                          // Rate Input
                          SizedBox(
                            width: 110,
                            child: TextFormField(
                              initialValue: sel.ratePerRoom.toInt().toString(),
                              keyboardType: TextInputType.number,
                              decoration: const InputDecoration(labelText: 'Rate / Day', prefixText: '₹', isDense: true),
                              onChanged: (v) {
                                final r = double.tryParse(v) ?? 0;
                                _roomSelections[idx] = RoomCategorySelection(
                                  category: sel.category,
                                  count: sel.count,
                                  ratePerRoom: r,
                                );
                                setState(() {});
                              },
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              );
            }),
            const Divider(height: 32),

            // 4. Add-on Charges
            const Text('Add-on Services', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            CheckboxListTile(
              title: const Text('Early Check-in'),
              value: _hasEarlyCheckIn,
              onChanged: (val) => setState(() => _hasEarlyCheckIn = val ?? false),
            ),
            if (_hasEarlyCheckIn)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: TextFormField(
                  controller: _earlyCheckInAmt,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(labelText: 'Early Check-in Amount (₹)'),
                  onChanged: (_) => setState(() {}),
                ),
              ),

            CheckboxListTile(
              title: const Text('Late Check-out'),
              value: _hasLateCheckout,
              onChanged: (val) => setState(() => _hasLateCheckout = val ?? false),
            ),
            if (_hasLateCheckout)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: TextFormField(
                  controller: _lateCheckoutAmt,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(labelText: 'Late Check-out Amount (₹)'),
                  onChanged: (_) => setState(() {}),
                ),
              ),

            CheckboxListTile(
              title: const Text('Extra Mattress'),
              value: _hasExtraMattress,
              onChanged: (val) => setState(() => _hasExtraMattress = val ?? false),
            ),
            if (_hasExtraMattress)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Row(
                  children: [
                    Row(
                      children: [
                        const Text('Qty: '),
                        IconButton(
                          icon: const Icon(Icons.remove),
                          onPressed: _mattressCount > 1 ? () => setState(() => _mattressCount--) : null,
                        ),
                        Text('$_mattressCount', style: const TextStyle(fontWeight: FontWeight.bold)),
                        IconButton(
                          icon: const Icon(Icons.add),
                          onPressed: () => setState(() => _mattressCount++),
                        ),
                      ],
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: TextFormField(
                        controller: _mattressRate,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(labelText: 'Rate / Night (₹)'),
                        onChanged: (_) => setState(() {}),
                      ),
                    ),
                  ],
                ),
              ),

            const SizedBox(height: 24),

            // Grand Total Calculation Card (NO GST)
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.indigo.shade50,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.indigo.shade200),
              ),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Room Subtotal ($_calculatedDurationDays ${_isSameDayStay ? "Day" : "Nights"})'),
                      Text(currency.format(_roomSubtotal), style: const TextStyle(fontWeight: FontWeight.w600)),
                    ],
                  ),
                  if (_addOnsSubtotal > 0) ...[
                    const SizedBox(height: 6),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Add-ons Total'),
                        Text(currency.format(_addOnsSubtotal), style: const TextStyle(fontWeight: FontWeight.w600)),
                      ],
                    ),
                  ],
                  const Divider(height: 20),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Total (No Tax / GST)', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                      Text(currency.format(_grandTotal), style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.indigo)),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Submit Button
            SizedBox(
              height: 50,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.indigo,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                onPressed: _isSubmitting ? null : _submit,
                child: _isSubmitting
                    ? const CircularProgressIndicator(color: Colors.white)
                    : const Text('Confirm Reservation', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
              ),
            ),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }
}

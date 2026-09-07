import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../models/booking_model.dart';
import '../providers/booking_provider.dart';

class CollectPaymentDialog extends StatefulWidget {
  final Booking booking;

  const CollectPaymentDialog({super.key, required this.booking});

  @override
  State<CollectPaymentDialog> createState() => _CollectPaymentDialogState();
}

class _CollectPaymentDialogState extends State<CollectPaymentDialog> {
  late final TextEditingController _amountController;
  String _paymentMethod = 'UPI';
  bool _isProcessing = false;

  @override
  void initState() {
    super.initState();
    _amountController = TextEditingController(
      text: widget.booking.balanceAmount > 0 ? widget.booking.balanceAmount.toInt().toString() : '0',
    );
  }

  void _submitPayment() async {
    final amount = double.tryParse(_amountController.text) ?? 0;
    if (amount <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter a valid payment amount')),
      );
      return;
    }

    setState(() => _isProcessing = true);

    final provider = Provider.of<BookingProvider>(context, listen: false);
    final success = await provider.recordPayment(widget.booking.id, amount, _paymentMethod);

    setState(() => _isProcessing = false);

    if (!mounted) return;

    if (success) {
      Navigator.pop(context, true);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Payment of ₹$amount via $_paymentMethod recorded successfully!')),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to record payment')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final currency = NumberFormat.currency(symbol: '₹ ', decimalDigits: 0);

    return AlertDialog(
      title: const Text('Collect Payment'),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Guest: ${widget.booking.guestName}', style: const TextStyle(fontWeight: FontWeight.bold)),
            Text('Pending Balance: ${currency.format(widget.booking.balanceAmount)}', style: const TextStyle(color: Colors.red)),
            const SizedBox(height: 16),
            const Text('Payment Method:', style: TextStyle(fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            SegmentedButton<String>(
              segments: const [
                ButtonSegment(value: 'UPI', label: Text('UPI'), icon: Icon(Icons.qr_code)),
                ButtonSegment(value: 'CASH', label: Text('Cash'), icon: Icon(Icons.money)),
                ButtonSegment(value: 'CARD', label: Text('Card'), icon: Icon(Icons.credit_card)),
              ],
              selected: {_paymentMethod},
              onSelectionChanged: (set) => setState(() => _paymentMethod = set.first),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _amountController,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(
                labelText: 'Amount (₹)',
                prefixText: '₹ ',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 8),
            Text(
              _paymentMethod == 'UPI' ? 'Instant UPI collection (No reference number required)' : 'Direct cash / card receipt',
              style: TextStyle(fontSize: 11, color: Colors.grey.shade600, fontStyle: FontStyle.italic),
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Cancel'),
        ),
        ElevatedButton(
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.green,
            foregroundColor: Colors.white,
          ),
          onPressed: _isProcessing ? null : _submitPayment,
          child: _isProcessing
              ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
              : const Text('Record Payment'),
        ),
      ],
    );
  }
}

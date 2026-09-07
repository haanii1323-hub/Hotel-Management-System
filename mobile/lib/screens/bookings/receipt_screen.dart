import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../models/booking_model.dart';

class ReceiptScreen extends StatelessWidget {
  final Booking booking;

  const ReceiptScreen({super.key, required this.booking});

  void _shareViaWhatsApp(BuildContext context) async {
    final phone = booking.guestPhone.replaceAll(RegExp(r'[^\d]'), '');
    final dateStr = DateFormat('dd MMM yyyy').format(booking.checkIn);
    final text = 'Dear ${booking.guestName}, here is your official receipt for your stay at Apex INN.\n'
        'Receipt #: ${booking.bookingNumber}\n'
        'Stay: $dateStr (${booking.durationLabel})\n'
        'Total Amount: Rs. ${booking.totalAmount.toStringAsFixed(2)}\n'
        'Paid: Rs. ${booking.paidAmount.toStringAsFixed(2)}\n'
        'Balance: Rs. ${booking.balanceAmount.toStringAsFixed(2)}\n'
        'Thank you for staying with Apex INN!';

    final uri = Uri.parse('https://wa.me/$phone?text=${Uri.encodeComponent(text)}');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } else {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Could not open WhatsApp')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final currencyFormat = NumberFormat.currency(symbol: '₹ ', decimalDigits: 0);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Guest Receipt'),
        actions: [
          IconButton(
            icon: const Icon(Icons.share),
            tooltip: 'Share WhatsApp Receipt',
            onPressed: () => _shareViaWhatsApp(context),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Card(
          elevation: 4,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          child: Padding(
            padding: const EdgeInsets.all(20.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Header
                Center(
                  child: Column(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                        decoration: BoxDecoration(
                          color: Colors.indigo.shade50,
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          'RECEIPT',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 2,
                            color: Colors.indigo.shade800,
                          ),
                        ),
                      ),
                      const SizedBox(height: 8),
                      const Text(
                        'APEX INN',
                        style: TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 1,
                        ),
                      ),
                      const Text(
                        'Luxury Stay & Hospitality',
                        style: TextStyle(fontSize: 12, color: Colors.grey),
                      ),
                    ],
                  ),
                ),
                const Divider(height: 32),

                // Booking & Guest Info
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('RECEIPT #', style: TextStyle(fontSize: 10, color: Colors.grey.shade600, fontWeight: FontWeight.bold)),
                        Text(booking.bookingNumber, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                      ],
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text('CHANNEL / SOURCE', style: TextStyle(fontSize: 10, color: Colors.grey.shade600, fontWeight: FontWeight.bold)),
                        Text(booking.source, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 16),

                // Guest Details Card
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.grey.shade50,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.grey.shade200),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Billed To: ${booking.guestName}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                      const SizedBox(height: 4),
                      Text('Phone: ${booking.guestPhone}', style: TextStyle(color: Colors.grey.shade700, fontSize: 12)),
                      if (booking.roomNumbers.isNotEmpty)
                        Text('Assigned Rooms: ${booking.roomNumbers.join(', ')}', style: TextStyle(color: Colors.grey.shade700, fontSize: 12)),
                      Text('Stay: ${booking.durationLabel} (${DateFormat('dd MMM').format(booking.checkIn)} - ${DateFormat('dd MMM').format(booking.checkOut)})',
                          style: TextStyle(color: Colors.grey.shade700, fontSize: 12)),
                    ],
                  ),
                ),
                const SizedBox(height: 20),

                // Itemized Room Breakdown
                const Text('ROOM & CHARGES BREAKDOWN', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, letterSpacing: 1)),
                const SizedBox(height: 8),
                if (booking.roomSelections.isNotEmpty)
                  ...booking.roomSelections.map((sel) {
                    final itemTotal = sel.count * sel.ratePerRoom * booking.durationDays;
                    return Padding(
                      padding: const EdgeInsets.symmetric(vertical: 4.0),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Text('${sel.count}x ${sel.category} (${currencyFormat.format(sel.ratePerRoom)}/day)'),
                          ),
                          Text(currencyFormat.format(itemTotal), style: const TextStyle(fontWeight: FontWeight.w600)),
                        ],
                      ),
                    );
                  })
                else
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Room Accommodation (${booking.durationLabel})'),
                      Text(currencyFormat.format(booking.roomTotal), style: const TextStyle(fontWeight: FontWeight.w600)),
                    ],
                  ),

                if (booking.addOnsTotal > 0) ...[
                  const SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Add-on Services (Early / Late / Mattress)'),
                      Text(currencyFormat.format(booking.addOnsTotal), style: const TextStyle(fontWeight: FontWeight.w600)),
                    ],
                  ),
                ],

                const Divider(height: 32),

                // Summary
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Total Amount', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                    Text(currencyFormat.format(booking.totalAmount), style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.indigo)),
                  ],
                ),
                const SizedBox(height: 6),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Amount Paid', style: TextStyle(color: Colors.green, fontWeight: FontWeight.w600)),
                    Text(currencyFormat.format(booking.paidAmount), style: const TextStyle(color: Colors.green, fontWeight: FontWeight.bold)),
                  ],
                ),
                const SizedBox(height: 6),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Balance Due', style: TextStyle(color: Colors.red, fontWeight: FontWeight.w600)),
                    Text(currencyFormat.format(booking.balanceAmount), style: const TextStyle(color: Colors.red, fontWeight: FontWeight.bold)),
                  ],
                ),
                const SizedBox(height: 24),

                // Bottom Share Action
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF25D366),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    icon: const Icon(Icons.send_rounded),
                    label: const Text('Send Receipt via WhatsApp', style: TextStyle(fontWeight: FontWeight.bold)),
                    onPressed: () => _shareViaWhatsApp(context),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

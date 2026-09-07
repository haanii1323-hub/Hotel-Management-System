import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../providers/booking_provider.dart';
import '../../services/api_service.dart';
import '../../widgets/collect_payment_dialog.dart';
import 'new_booking_screen.dart';
import 'receipt_screen.dart';

class BookingsListScreen extends StatefulWidget {
  const BookingsListScreen({super.key});

  @override
  State<BookingsListScreen> createState() => _BookingsListScreenState();
}

class _BookingsListScreenState extends State<BookingsListScreen> {
  final TextEditingController _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<BookingProvider>(context, listen: false).loadBookings();
    });
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'CHECKED_IN':
        return Colors.green;
      case 'CONFIRMED':
        return Colors.blue;
      case 'CHECKED_OUT':
        return Colors.grey;
      case 'CANCELLED':
        return Colors.red;
      default:
        return Colors.indigo;
    }
  }

  @override
  Widget build(BuildContext context) {
    final currency = NumberFormat.currency(symbol: '₹ ', decimalDigits: 0);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Bookings & Reservations', style: TextStyle(fontWeight: FontWeight.bold)),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => Provider.of<BookingProvider>(context, listen: false).loadBookings(),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: Colors.indigo,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add),
        label: const Text('New Booking'),
        onPressed: () {
          Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => const NewBookingScreen()),
          );
        },
      ),
      body: Consumer<BookingProvider>(
        builder: (context, provider, child) {
          return Column(
            children: [
              // Search Bar
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
                child: TextField(
                  controller: _searchController,
                  decoration: InputDecoration(
                    hintText: 'Search guest name, phone, booking ID...',
                    prefixIcon: const Icon(Icons.search),
                    suffixIcon: _searchController.text.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear),
                            onPressed: () {
                              _searchController.clear();
                              provider.setSearchQuery('');
                            },
                          )
                        : null,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    isDense: true,
                  ),
                  onChanged: (v) => provider.setSearchQuery(v),
                ),
              ),

              // Source Filter Chips (12 channels)
              SizedBox(
                height: 40,
                child: ListView(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  children: [
                    ChoiceChip(
                      label: const Text('All Channels'),
                      selected: provider.selectedSource == 'ALL',
                      onSelected: (_) => provider.setSource('ALL'),
                    ),
                    const SizedBox(width: 8),
                    ...ApiService.availableSources.map((src) {
                      return Padding(
                        padding: const EdgeInsets.only(right: 8.0),
                        child: ChoiceChip(
                          label: Text(src),
                          selected: provider.selectedSource == src,
                          onSelected: (_) => provider.setSource(src),
                        ),
                      );
                    }),
                  ],
                ),
              ),
              const SizedBox(height: 8),

              // Bookings List View
              Expanded(
                child: provider.isLoading
                    ? const Center(child: CircularProgressIndicator())
                    : provider.bookings.isEmpty
                        ? Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(Icons.inbox, size: 64, color: Colors.grey.shade400),
                                const SizedBox(height: 12),
                                Text(
                                  provider.errorMessage ?? 'No reservations found',
                                  style: TextStyle(color: Colors.grey.shade600),
                                ),
                              ],
                            ),
                          )
                        : RefreshIndicator(
                            onRefresh: () => provider.loadBookings(),
                            child: ListView.builder(
                              itemCount: provider.bookings.length,
                              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                              itemBuilder: (context, index) {
                                final b = provider.bookings[index];
                                final statusColor = _getStatusColor(b.status);

                                return Card(
                                  elevation: 2,
                                  margin: const EdgeInsets.symmetric(vertical: 6),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                  child: Padding(
                                    padding: const EdgeInsets.all(14.0),
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        // Top Row: Booking ID, Channel, Status Badge
                                        Row(
                                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                          children: [
                                            Row(
                                              children: [
                                                Text(b.bookingNumber, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                                                const SizedBox(width: 8),
                                                Container(
                                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                                  decoration: BoxDecoration(
                                                    color: Colors.indigo.shade50,
                                                    borderRadius: BorderRadius.circular(4),
                                                  ),
                                                  child: Text(b.source, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: Colors.indigo.shade700)),
                                                ),
                                              ],
                                            ),
                                            Container(
                                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                              decoration: BoxDecoration(
                                                color: statusColor.withValues(alpha: 0.12),
                                                borderRadius: BorderRadius.circular(20),
                                              ),
                                              child: Text(
                                                b.status.replaceAll('_', ' '),
                                                style: TextStyle(color: statusColor, fontSize: 11, fontWeight: FontWeight.bold),
                                              ),
                                            ),
                                          ],
                                        ),
                                        const SizedBox(height: 8),

                                        // Guest Name & Phone
                                        Text(b.guestName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                                        Text(b.guestPhone, style: TextStyle(color: Colors.grey.shade600, fontSize: 13)),
                                        const SizedBox(height: 6),

                                        // Stay Duration & Room Badges
                                        Row(
                                          children: [
                                            Icon(Icons.access_time, size: 14, color: Colors.grey.shade600),
                                            const SizedBox(width: 4),
                                            Text(b.durationLabel, style: TextStyle(fontSize: 12, color: Colors.grey.shade800, fontWeight: FontWeight.w500)),
                                            const Spacer(),
                                            if (b.roomNumbers.isNotEmpty)
                                              Text('Room ${b.roomNumbers.join(", ")}', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 12)),
                                          ],
                                        ),
                                        const Divider(height: 20),

                                        // Bottom Row: Financials & Action Buttons
                                        Row(
                                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                          children: [
                                            Column(
                                              crossAxisAlignment: CrossAxisAlignment.start,
                                              children: [
                                                Text('Total: ${currency.format(b.totalAmount)}', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                                                if (b.balanceAmount > 0)
                                                  Text('Due: ${currency.format(b.balanceAmount)}', style: const TextStyle(fontSize: 12, color: Colors.red, fontWeight: FontWeight.w600))
                                                else
                                                  const Text('Fully Paid', style: TextStyle(fontSize: 12, color: Colors.green, fontWeight: FontWeight.w600)),
                                              ],
                                            ),
                                            Row(
                                              children: [
                                                if (b.balanceAmount > 0)
                                                  OutlinedButton(
                                                    style: OutlinedButton.styleFrom(
                                                      foregroundColor: Colors.green,
                                                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                                      minimumSize: Size.zero,
                                                    ),
                                                    onPressed: () {
                                                      showDialog(
                                                        context: context,
                                                        builder: (_) => CollectPaymentDialog(booking: b),
                                                      );
                                                    },
                                                    child: const Text('Pay ₹', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                                                  ),
                                                const SizedBox(width: 8),
                                                ElevatedButton(
                                                  style: ElevatedButton.styleFrom(
                                                    backgroundColor: Colors.indigo.shade50,
                                                    foregroundColor: Colors.indigo.shade800,
                                                    elevation: 0,
                                                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                                    minimumSize: Size.zero,
                                                  ),
                                                  onPressed: () {
                                                    Navigator.push(
                                                      context,
                                                      MaterialPageRoute(builder: (_) => ReceiptScreen(booking: b)),
                                                    );
                                                  },
                                                  child: const Text('Receipt', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                                                ),
                                              ],
                                            ),
                                          ],
                                        ),
                                      ],
                                    ),
                                  ),
                                );
                              },
                            ),
                          ),
              ),
            ],
          );
        },
      ),
    );
  }
}

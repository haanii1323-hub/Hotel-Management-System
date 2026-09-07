import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../providers/booking_provider.dart';
import 'bookings/new_booking_screen.dart';

class DashboardScreen extends StatelessWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final currency = NumberFormat.currency(symbol: '₹ ', decimalDigits: 0);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Apex INN PMS', style: TextStyle(fontWeight: FontWeight.bold)),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => Provider.of<BookingProvider>(context, listen: false).loadBookings(),
          ),
        ],
      ),
      body: Consumer<BookingProvider>(
        builder: (context, provider, child) {
          return RefreshIndicator(
            onRefresh: () => provider.loadBookings(),
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                // Header Welcome Card
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFF3730A3), Color(0xFF4F46E5)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Front Desk & Operations',
                        style: TextStyle(color: Colors.white70, fontSize: 13),
                      ),
                      const SizedBox(height: 6),
                      const Text(
                        'APEX INN Hotel',
                        style: TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 16),
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.2),
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: const Row(
                              children: [
                                Icon(Icons.cloud_done, color: Colors.greenAccent, size: 16),
                                SizedBox(width: 6),
                                Text('Live Cloud Sync', style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),

                // Metrics Grid
                const Text('Overview & Performance', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                const SizedBox(height: 12),
                GridView.count(
                  crossAxisCount: 2,
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  crossAxisSpacing: 12,
                  mainAxisSpacing: 12,
                  childAspectRatio: 1.4,
                  children: [
                    _buildStatCard(
                      title: 'Total Revenue',
                      value: currency.format(provider.totalRevenue),
                      icon: Icons.currency_rupee,
                      color: Colors.green,
                    ),
                    _buildStatCard(
                      title: 'Active Guests',
                      value: '${provider.activeGuests}',
                      icon: Icons.hotel,
                      color: Colors.indigo,
                    ),
                    _buildStatCard(
                      title: 'Confirmed Stays',
                      value: '${provider.confirmedUpcoming}',
                      icon: Icons.event_available,
                      color: Colors.blue,
                    ),
                    _buildStatCard(
                      title: 'Total Bookings',
                      value: '${provider.totalBookings}',
                      icon: Icons.receipt_long,
                      color: Colors.purple,
                    ),
                  ],
                ),
                const SizedBox(height: 24),

                // Quick Action Cards
                const Text('Quick Operations', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                const SizedBox(height: 12),
                ListTile(
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                    side: BorderSide(color: Colors.grey.shade200),
                  ),
                  tileColor: Colors.white,
                  leading: const CircleAvatar(
                    backgroundColor: Color(0xFFEEF2FF),
                    child: Icon(Icons.add_business, color: Colors.indigo),
                  ),
                  title: const Text('Create New Reservation', style: TextStyle(fontWeight: FontWeight.bold)),
                  subtitle: const Text('Multi-room, same-day & 12 OTA sources'),
                  trailing: const Icon(Icons.arrow_forward_ios, size: 16),
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const NewBookingScreen()),
                    );
                  },
                ),
                const SizedBox(height: 10),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildStatCard({
    required String title,
    required String value,
    required IconData icon,
    required Color color,
  }) {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(title, style: TextStyle(fontSize: 12, color: Colors.grey.shade600, fontWeight: FontWeight.w600)),
                Icon(icon, size: 20, color: color),
              ],
            ),
            Text(
              value,
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: color),
            ),
          ],
        ),
      ),
    );
  }
}

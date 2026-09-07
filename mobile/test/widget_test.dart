import 'package:flutter_test/flutter_test.dart';
import 'package:apex_inn_mobile/main.dart';

void main() {
  testWidgets('App smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const ApexInnApp());
    expect(find.text('Apex INN PMS'), findsOneWidget);
  });
}

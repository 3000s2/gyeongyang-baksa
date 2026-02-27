-- ============================================================
-- 나만의 경영박사 v4.5 — Sample Data (한식당 "서울맛집")
-- Run this AFTER fresh app launch (tables already created)
-- ============================================================

-- Company Info
UPDATE company_info SET
  name='서울맛집 Korean Kitchen',
  address='456 Yonge Street, Toronto, ON M4Y 1W9',
  contact='416-555-0123 | info@seoulmatjip.ca',
  notes='Since 2023 — Authentic Korean Home Cooking',
  receipt_folder='',
  tax_gst=0, tax_pst=0, tax_hst=13
WHERE id=1;

-- ============================================================
-- RAW MATERIAL DB (ingredient names list)
-- ============================================================
INSERT OR IGNORE INTO material_db (name) VALUES
  ('쌀 (Rice)'),('고추장 (Gochujang)'),('된장 (Doenjang)'),('간장 (Soy Sauce)'),
  ('참기름 (Sesame Oil)'),('고춧가루 (Chili Flakes)'),('마늘 (Garlic)'),('양파 (Onion)'),
  ('소고기 (Beef)'),('돼지고기 (Pork)'),('닭고기 (Chicken)'),('두부 (Tofu)'),
  ('배추 (Napa Cabbage)'),('무 (Radish)'),('당면 (Glass Noodles)'),('김 (Seaweed)'),
  ('계란 (Eggs)'),('시금치 (Spinach)'),('콩나물 (Bean Sprouts)'),('설탕 (Sugar)');

-- ============================================================
-- MATERIALS (actual inventory)
-- ============================================================
INSERT INTO materials (material_db_id, name, quantity, uom, alert_qty) VALUES
  (1, '쌀 (Rice)', 45.0, 'Kg', 10),
  (2, '고추장 (Gochujang)', 8.5, 'Kg', 3),
  (3, '된장 (Doenjang)', 6.0, 'Kg', 2),
  (4, '간장 (Soy Sauce)', 12.0, 'Bottle', 3),
  (5, '참기름 (Sesame Oil)', 4.0, 'Bottle', 2),
  (6, '고춧가루 (Chili Flakes)', 3.5, 'Kg', 1),
  (7, '마늘 (Garlic)', 5.0, 'Kg', 2),
  (8, '양파 (Onion)', 15.0, 'Kg', 5),
  (9, '소고기 (Beef)', 22.0, 'Kg', 8),
  (10, '돼지고기 (Pork)', 18.0, 'Kg', 6),
  (11, '닭고기 (Chicken)', 14.0, 'Kg', 5),
  (12, '두부 (Tofu)', 20.0, 'Box', 5),
  (13, '배추 (Napa Cabbage)', 25.0, 'Kg', 8),
  (14, '무 (Radish)', 10.0, 'Kg', 3),
  (15, '당면 (Glass Noodles)', 6.0, 'Kg', 2),
  (16, '김 (Seaweed)', 30.0, 'Box', 5),
  (17, '계란 (Eggs)', 120.0, 'NMB', 30),
  (18, '시금치 (Spinach)', 4.0, 'Kg', 2),
  (19, '콩나물 (Bean Sprouts)', 8.0, 'Kg', 3),
  (20, '설탕 (Sugar)', 5.0, 'Kg', 2);

-- ============================================================
-- MATERIAL LOG (stock history — 40 entries over 2 months)
-- ============================================================
INSERT INTO material_log (material_id, type, qty, prev_qty, new_qty, date, note) VALUES
  -- Jan purchases
  (1, 'add', 50.0, 0, 50.0, '2026-01-05', 'H-Mart 대량구매'),
  (9, 'add', 30.0, 0, 30.0, '2026-01-05', 'Costco beef bulk'),
  (10, 'add', 25.0, 0, 25.0, '2026-01-05', 'Costco pork bulk'),
  (11, 'add', 20.0, 0, 20.0, '2026-01-05', 'PAT Mart'),
  (13, 'add', 30.0, 0, 30.0, '2026-01-06', '배추 한박스'),
  (17, 'add', 180.0, 0, 180.0, '2026-01-06', '계란 15판'),
  (2, 'add', 10.0, 0, 10.0, '2026-01-07', '고추장 대용량'),
  (3, 'add', 8.0, 0, 8.0, '2026-01-07', '된장 대용량'),
  -- Jan usage
  (1, 'use', 8.0, 50.0, 42.0, '2026-01-10', '1주 사용'),
  (9, 'use', 5.0, 30.0, 25.0, '2026-01-10', '불고기용'),
  (10, 'use', 4.0, 25.0, 21.0, '2026-01-10', '제육용'),
  (17, 'use', 30.0, 180.0, 150.0, '2026-01-10', '비빔밥/계란찜'),
  (1, 'use', 7.0, 42.0, 35.0, '2026-01-17', '2주 사용'),
  (9, 'use', 6.0, 25.0, 19.0, '2026-01-17', '불고기'),
  (11, 'use', 4.0, 20.0, 16.0, '2026-01-17', '닭볶음탕'),
  (13, 'use', 8.0, 30.0, 22.0, '2026-01-17', '김치 담금'),
  -- Feb purchases
  (1, 'add', 20.0, 35.0, 55.0, '2026-02-01', 'H-Mart'),
  (9, 'add', 15.0, 19.0, 34.0, '2026-02-01', 'Costco'),
  (10, 'add', 10.0, 21.0, 31.0, '2026-02-01', 'Costco'),
  (17, 'add', 60.0, 150.0, 210.0, '2026-02-03', '계란 5판'),
  (15, 'add', 8.0, 0, 8.0, '2026-02-03', '당면'),
  (12, 'add', 25.0, 0, 25.0, '2026-02-03', '두부'),
  -- Feb usage
  (1, 'use', 10.0, 55.0, 45.0, '2026-02-10', '2주 사용'),
  (9, 'use', 12.0, 34.0, 22.0, '2026-02-10', '불고기 대량'),
  (10, 'use', 13.0, 31.0, 18.0, '2026-02-14', '제육+김치찌개'),
  (11, 'use', 6.0, 16.0, 10.0, '2026-02-14', '닭볶음탕'),
  (17, 'use', 90.0, 210.0, 120.0, '2026-02-20', '2주 사용'),
  (12, 'use', 5.0, 25.0, 20.0, '2026-02-20', '순두부찌개'),
  (15, 'use', 2.0, 8.0, 6.0, '2026-02-20', '잡채'),
  (13, 'use', 5.0, 22.0, 17.0, '2026-02-20', '김치찌개'),
  -- Low stock item for alert testing
  (18, 'use', 2.0, 6.0, 4.0, '2026-02-22', '나물'),
  (19, 'use', 5.0, 13.0, 8.0, '2026-02-22', '콩나물국');

-- ============================================================
-- CATALOG (menu products)
-- ============================================================
INSERT INTO catalog (name, price, note) VALUES
  ('불고기 정식 (Bulgogi Set)', 18.99, 'Best seller — marinated beef with rice & sides'),
  ('비빔밥 (Bibimbap)', 15.99, 'Mixed rice with vegetables & egg'),
  ('김치찌개 (Kimchi Jjigae)', 14.99, 'Spicy kimchi stew with pork'),
  ('된장찌개 (Doenjang Jjigae)', 13.99, 'Soybean paste stew with tofu'),
  ('순두부찌개 (Sundubu Jjigae)', 14.99, 'Soft tofu stew — mild/medium/spicy'),
  ('제육볶음 (Jeyuk Bokkeum)', 16.99, 'Spicy stir-fried pork'),
  ('잡채 (Japchae)', 14.99, 'Glass noodle stir-fry'),
  ('닭볶음탕 (Dakbokkeum)', 17.99, 'Braised spicy chicken'),
  ('김밥 세트 (Gimbap Set)', 12.99, 'Seaweed rice roll — 2 rolls'),
  ('떡볶이 (Tteokbokki)', 11.99, 'Spicy rice cakes'),
  ('만두 (Mandu) 10pc', 10.99, 'Pan-fried dumplings'),
  ('갈비탕 (Galbitang)', 19.99, 'Short rib soup'),
  ('김치전 (Kimchi Pancake)', 12.99, 'Crispy kimchi pancake'),
  ('계란찜 (Steamed Egg)', 8.99, 'Side dish — fluffy steamed egg'),
  ('공기밥 (Extra Rice)', 2.50, 'Additional rice bowl');

-- ============================================================
-- CUSTOMERS (10 individual + 3 business)
-- ============================================================
INSERT INTO customers (cust_id, type, name, phone, address, discount_rate, lat, lng) VALUES
  ('C-01', 'individual', '김민수', '416-555-1001', '120 Bloor St W, Toronto, ON M5S 1S4', 0, 43.6706, -79.3929),
  ('C-02', 'individual', '박지영', '416-555-1002', '88 Queens Quay W, Toronto, ON M5J 0B6', 0, 43.6389, -79.3815),
  ('C-03', 'individual', '이승호', '647-555-1003', '200 University Ave, Toronto, ON M5H 3C6', 0, 43.6513, -79.3845),
  ('C-04', 'individual', '정수진', '416-555-1004', '55 Eglinton Ave E, Toronto, ON M4P 1G8', 0, 43.7079, -79.3984),
  ('C-05', 'individual', 'David Kim', '647-555-1005', '8 Olympic Garden Dr, North York, ON M2M 0B1', 0, 43.7935, -79.4153),
  ('C-06', 'individual', 'Sarah Park', '416-555-1006', '3401 Dufferin St, North York, ON M6A 2T9', 0, 43.7282, -79.4510),
  ('C-07', 'individual', '최유진', '647-555-1007', '1 Dundas St W, Toronto, ON M5G 1Z3', 0, 43.6561, -79.3817),
  ('C-08', 'individual', 'Tom Lee', '416-555-1008', '770 Don Mills Rd, North York, ON M3C 1T3', 0, 43.7274, -79.3440),
  ('C-09', 'individual', '한소희', '647-555-1009', '5985 Yonge St, North York, ON M2M 3V7', 0, 43.7970, -79.4176),
  ('C-10', 'individual', 'James Cho', '416-555-1010', '2300 Yonge St, Toronto, ON M4P 1E4', 0, 43.7092, -79.3985),
  ('I-01', 'business', 'Korean Culture Centre', '416-555-2001', '1133 Leslie St, North York, ON M3C 2J6', 10, 43.7231, -79.3348),
  ('I-02', 'business', 'Toronto K-Food Catering', '647-555-2002', '5460 Yonge St, North York, ON M2N 6K7', 8, 43.7867, -79.4149),
  ('I-03', 'business', 'U of T Korean Student Assoc.', '416-555-2003', '21 Sussex Ave, Toronto, ON M5S 1J6', 15, 43.6633, -79.3957);

-- ============================================================
-- PURCHASE ORDERS (30+ orders, Jan-Feb 2026)
-- Mix of individual/business, various payment methods/statuses
-- ============================================================

-- PO 1: C-01 김민수 (paid, cash)
INSERT INTO purchase_orders (customer_id, order_date, delivery_date, discount, discount_type, tax_hst, tax_hst_rate, payment_method, payment_status, paid_amount, subtotal, total, note, order_status, delivery_address, delivered) VALUES
  (1, '2026-01-08', '2026-01-09', 0, '$', 4.55, 13, 'CASH', 'Paid', 34.98, 34.98, 39.53, '', '', '120 Bloor St W, Toronto, ON M5S 1S4', 1);
INSERT INTO po_items (po_id, catalog_id, product_name, qty, price, total) VALUES
  (1, 1, '불고기 정식 (Bulgogi Set)', 1, 18.99, 18.99),
  (1, 2, '비빔밥 (Bibimbap)', 1, 15.99, 15.99);

-- PO 2: C-02 박지영 (paid, e-transfer)
INSERT INTO purchase_orders (customer_id, order_date, delivery_date, discount, discount_type, tax_hst, tax_hst_rate, payment_method, payment_status, paid_amount, subtotal, total, note, order_status, delivery_address, delivered) VALUES
  (2, '2026-01-10', '2026-01-11', 0, '$', 5.85, 13, 'E-transfer', 'Paid', 45.01, 44.97, 50.82, '', '', '88 Queens Quay W, Toronto, ON M5J 0B6', 1);
INSERT INTO po_items (po_id, catalog_id, product_name, qty, price, total) VALUES
  (2, 3, '김치찌개 (Kimchi Jjigae)', 2, 14.99, 29.98),
  (2, 2, '비빔밥 (Bibimbap)', 1, 15.99, 15.99);

-- PO 3: I-01 Korean Culture Centre (business, 10% discount, partial paid)
INSERT INTO purchase_orders (customer_id, order_date, delivery_date, discount, discount_type, tax_hst, tax_hst_rate, payment_method, payment_status, paid_amount, subtotal, total, note, order_status, delivery_address, delivered) VALUES
  (11, '2026-01-12', '2026-01-13', 10, '%', 20.79, 13, 'E-transfer', 'Partial', 100.00, 159.90, 180.69, '문화센터 행사 케이터링', '', '1133 Leslie St, North York, ON M3C 2J6', 1);
INSERT INTO po_items (po_id, catalog_id, product_name, qty, price, total) VALUES
  (3, 1, '불고기 정식 (Bulgogi Set)', 5, 18.99, 94.95),
  (3, 7, '잡채 (Japchae)', 3, 14.99, 44.97),
  (3, 14, '계란찜 (Steamed Egg)', 2, 8.99, 17.98),
  (3, 15, '공기밥 (Extra Rice)', 1, 2.50, 2.50);
INSERT INTO payment_log (po_id, amount, date, note) VALUES
  (3, 100.00, '2026-01-12', 'Deposit e-transfer');

-- PO 4: C-03 이승호 (unpaid)
INSERT INTO purchase_orders (customer_id, order_date, delivery_date, discount, discount_type, tax_hst, tax_hst_rate, payment_method, payment_status, paid_amount, subtotal, total, note, order_status, delivery_address, delivered) VALUES
  (3, '2026-01-15', '2026-01-16', 0, '$', 3.90, 13, 'CASH', 'Unpaid', 0, 29.98, 33.88, '', '', '200 University Ave, Toronto, ON M5H 3C6', 1);
INSERT INTO po_items (po_id, catalog_id, product_name, qty, price, total) VALUES
  (4, 6, '제육볶음 (Jeyuk Bokkeum)', 1, 16.99, 16.99),
  (4, 4, '된장찌개 (Doenjang Jjigae)', 1, 13.99, 13.99);

-- PO 5: C-04 정수진 (paid, cash)
INSERT INTO purchase_orders (customer_id, order_date, delivery_date, discount, discount_type, tax_hst, tax_hst_rate, payment_method, payment_status, paid_amount, subtotal, total, note, order_status, delivery_address, delivered) VALUES
  (4, '2026-01-18', '2026-01-19', 0, '$', 5.33, 13, 'CASH', 'Paid', 41.00, 40.97, 46.30, '', '', '55 Eglinton Ave E, Toronto, ON M4P 1G8', 1);
INSERT INTO po_items (po_id, catalog_id, product_name, qty, price, total) VALUES
  (5, 8, '닭볶음탕 (Dakbokkeum)', 1, 17.99, 17.99),
  (5, 10, '떡볶이 (Tteokbokki)', 1, 11.99, 11.99),
  (5, 11, '만두 (Mandu) 10pc', 1, 10.99, 10.99);

-- PO 6: C-05 David Kim (paid, e-transfer)
INSERT INTO purchase_orders (customer_id, order_date, delivery_date, discount, discount_type, tax_hst, tax_hst_rate, payment_method, payment_status, paid_amount, subtotal, total, note, order_status, delivery_address, delivered) VALUES
  (5, '2026-01-20', '2026-01-21', 0, '$', 7.02, 13, 'E-transfer', 'Paid', 54.00, 53.97, 60.99, 'Birthday party order', '', '8 Olympic Garden Dr, North York, ON M2M 0B1', 1);
INSERT INTO po_items (po_id, catalog_id, product_name, qty, price, total) VALUES
  (6, 1, '불고기 정식 (Bulgogi Set)', 2, 18.99, 37.98),
  (6, 2, '비빔밥 (Bibimbap)', 1, 15.99, 15.99);

-- PO 7: C-06 Sarah Park (paid, cash)
INSERT INTO purchase_orders (customer_id, order_date, delivery_date, discount, discount_type, tax_hst, tax_hst_rate, payment_method, payment_status, paid_amount, subtotal, total, note, order_status, delivery_address, delivered) VALUES
  (6, '2026-01-22', '2026-01-23', 0, '$', 3.38, 13, 'CASH', 'Paid', 26.00, 25.98, 29.36, '', '', '3401 Dufferin St, North York, ON M6A 2T9', 1);
INSERT INTO po_items (po_id, catalog_id, product_name, qty, price, total) VALUES
  (7, 9, '김밥 세트 (Gimbap Set)', 2, 12.99, 25.98);

-- PO 8: I-02 Toronto K-Food Catering (business, 8% disc)
INSERT INTO purchase_orders (customer_id, order_date, delivery_date, discount, discount_type, tax_hst, tax_hst_rate, payment_method, payment_status, paid_amount, subtotal, total, note, order_status, delivery_address, delivered) VALUES
  (12, '2026-01-25', '2026-01-26', 8, '%', 28.60, 13, 'E-transfer', 'Paid', 248.57, 219.90, 248.57, '주간 케이터링 납품', '', '5460 Yonge St, North York, ON M2N 6K7', 1);
INSERT INTO po_items (po_id, catalog_id, product_name, qty, price, total) VALUES
  (8, 1, '불고기 정식 (Bulgogi Set)', 5, 18.99, 94.95),
  (8, 3, '김치찌개 (Kimchi Jjigae)', 5, 14.99, 74.95),
  (8, 7, '잡채 (Japchae)', 2, 14.99, 29.98),
  (8, 14, '계란찜 (Steamed Egg)', 2, 8.99, 17.98),
  (8, 15, '공기밥 (Extra Rice)', 1, 2.50, 2.50);
INSERT INTO payment_log (po_id, amount, date, note) VALUES
  (8, 248.57, '2026-01-26', 'E-transfer 완료');

-- PO 9: C-07 최유진 (paid, cash)
INSERT INTO purchase_orders (customer_id, order_date, delivery_date, discount, discount_type, tax_hst, tax_hst_rate, payment_method, payment_status, paid_amount, subtotal, total, note, order_status, delivery_address, delivered) VALUES
  (7, '2026-01-28', '2026-01-29', 0, '$', 2.60, 13, 'CASH', 'Paid', 20.00, 19.98, 22.58, '', '', '1 Dundas St W, Toronto, ON M5G 1Z3', 1);
INSERT INTO po_items (po_id, catalog_id, product_name, qty, price, total) VALUES
  (9, 13, '김치전 (Kimchi Pancake)', 1, 12.99, 12.99),
  (9, 14, '계란찜 (Steamed Egg)', 1, 8.99, 8.99);

-- PO 10: C-08 Tom Lee (paid)
INSERT INTO purchase_orders (customer_id, order_date, delivery_date, discount, discount_type, tax_hst, tax_hst_rate, payment_method, payment_status, paid_amount, subtotal, total, note, order_status, delivery_address, delivered) VALUES
  (8, '2026-01-30', '2026-01-31', 0, '$', 2.60, 13, 'E-transfer', 'Paid', 22.58, 19.98, 22.58, '', '', '770 Don Mills Rd, North York, ON M3C 1T3', 1);
INSERT INTO po_items (po_id, catalog_id, product_name, qty, price, total) VALUES
  (10, 12, '갈비탕 (Galbitang)', 1, 19.99, 19.99);

-- PO 11: C-01 김민수 (repeat customer, Feb)
INSERT INTO purchase_orders (customer_id, order_date, delivery_date, discount, discount_type, tax_hst, tax_hst_rate, payment_method, payment_status, paid_amount, subtotal, total, note, order_status, delivery_address, delivered) VALUES
  (1, '2026-02-02', '2026-02-03', 0, '$', 6.37, 13, 'CASH', 'Paid', 55.35, 48.97, 55.34, '', '', '120 Bloor St W, Toronto, ON M5S 1S4', 1);
INSERT INTO po_items (po_id, catalog_id, product_name, qty, price, total) VALUES
  (11, 1, '불고기 정식 (Bulgogi Set)', 1, 18.99, 18.99),
  (11, 5, '순두부찌개 (Sundubu Jjigae)', 1, 14.99, 14.99),
  (11, 2, '비빔밥 (Bibimbap)', 1, 15.99, 15.99);

-- PO 12: I-03 U of T Korean Student Assoc (business, 15% disc)
INSERT INTO purchase_orders (customer_id, order_date, delivery_date, discount, discount_type, tax_hst, tax_hst_rate, payment_method, payment_status, paid_amount, subtotal, total, note, order_status, delivery_address, delivered) VALUES
  (13, '2026-02-05', '2026-02-06', 15, '%', 23.44, 13, 'E-transfer', 'Paid', 203.77, 180.35, 203.77, '유학생 모임 50명', '', '21 Sussex Ave, Toronto, ON M5S 1J6', 1);
INSERT INTO po_items (po_id, catalog_id, product_name, qty, price, total) VALUES
  (12, 2, '비빔밥 (Bibimbap)', 5, 15.99, 79.95),
  (12, 9, '김밥 세트 (Gimbap Set)', 5, 12.99, 64.95),
  (12, 10, '떡볶이 (Tteokbokki)', 3, 11.99, 35.97);
INSERT INTO payment_log (po_id, amount, date, note) VALUES
  (12, 203.77, '2026-02-06', 'U of T e-transfer');

-- PO 13: C-09 한소희
INSERT INTO purchase_orders (customer_id, order_date, delivery_date, discount, discount_type, tax_hst, tax_hst_rate, payment_method, payment_status, paid_amount, subtotal, total, note, order_status, delivery_address, delivered) VALUES
  (9, '2026-02-07', '2026-02-08', 0, '$', 4.42, 13, 'CASH', 'Paid', 38.40, 33.98, 38.40, '', '', '5985 Yonge St, North York, ON M2M 3V7', 1);
INSERT INTO po_items (po_id, catalog_id, product_name, qty, price, total) VALUES
  (13, 1, '불고기 정식 (Bulgogi Set)', 1, 18.99, 18.99),
  (13, 7, '잡채 (Japchae)', 1, 14.99, 14.99);

-- PO 14: C-10 James Cho
INSERT INTO purchase_orders (customer_id, order_date, delivery_date, discount, discount_type, tax_hst, tax_hst_rate, payment_method, payment_status, paid_amount, subtotal, total, note, order_status, delivery_address, delivered) VALUES
  (10, '2026-02-08', '2026-02-09', 0, '$', 4.03, 13, 'E-transfer', 'Paid', 35.00, 30.98, 35.01, '', '', '2300 Yonge St, Toronto, ON M4P 1E4', 0);
INSERT INTO po_items (po_id, catalog_id, product_name, qty, price, total) VALUES
  (14, 6, '제육볶음 (Jeyuk Bokkeum)', 1, 16.99, 16.99),
  (14, 4, '된장찌개 (Doenjang Jjigae)', 1, 13.99, 13.99);

-- PO 15: I-01 Korean Culture Centre (repeat, Feb)
INSERT INTO purchase_orders (customer_id, order_date, delivery_date, discount, discount_type, tax_hst, tax_hst_rate, payment_method, payment_status, paid_amount, subtotal, total, note, order_status, delivery_address, delivered) VALUES
  (11, '2026-02-10', '2026-02-11', 10, '%', 16.60, 13, 'E-transfer', 'Unpaid', 0, 127.90, 144.50, '설날 특별 행사', '', '1133 Leslie St, North York, ON M3C 2J6', 0);
INSERT INTO po_items (po_id, catalog_id, product_name, qty, price, total) VALUES
  (15, 12, '갈비탕 (Galbitang)', 4, 19.99, 79.96),
  (15, 1, '불고기 정식 (Bulgogi Set)', 2, 18.99, 37.98),
  (15, 14, '계란찜 (Steamed Egg)', 1, 8.99, 8.99),
  (15, 15, '공기밥 (Extra Rice)', 1, 2.50, 2.50);

-- PO 16-20: More February orders
INSERT INTO purchase_orders (customer_id, order_date, delivery_date, discount, discount_type, tax_hst, tax_hst_rate, payment_method, payment_status, paid_amount, subtotal, total, note, order_status, delivery_address, delivered) VALUES
  (2, '2026-02-12', '2026-02-13', 0, '$', 4.42, 13, 'CASH', 'Paid', 38.40, 33.98, 38.40, '', '', '88 Queens Quay W, Toronto, ON M5J 0B6', 1);
INSERT INTO po_items (po_id, catalog_id, product_name, qty, price, total) VALUES
  (16, 8, '닭볶음탕 (Dakbokkeum)', 1, 17.99, 17.99),
  (16, 2, '비빔밥 (Bibimbap)', 1, 15.99, 15.99);

INSERT INTO purchase_orders (customer_id, order_date, delivery_date, discount, discount_type, tax_hst, tax_hst_rate, payment_method, payment_status, paid_amount, subtotal, total, note, order_status, delivery_address, delivered) VALUES
  (4, '2026-02-14', '2026-02-15', 0, '$', 4.94, 13, 'E-transfer', 'Paid', 42.92, 37.98, 42.92, 'Valentine special', '', '55 Eglinton Ave E, Toronto, ON M4P 1G8', 1);
INSERT INTO po_items (po_id, catalog_id, product_name, qty, price, total) VALUES
  (17, 1, '불고기 정식 (Bulgogi Set)', 2, 18.99, 37.98);
INSERT INTO payment_log (po_id, amount, date, note) VALUES
  (17, 42.92, '2026-02-14', 'Valentine order e-transfer');

INSERT INTO purchase_orders (customer_id, order_date, delivery_date, discount, discount_type, tax_hst, tax_hst_rate, payment_method, payment_status, paid_amount, subtotal, total, note, order_status, delivery_address, delivered) VALUES
  (6, '2026-02-16', '2026-02-17', 0, '$', 3.38, 13, 'CASH', 'Unpaid', 0, 25.98, 29.36, '', '', '3401 Dufferin St, North York, ON M6A 2T9', 0);
INSERT INTO po_items (po_id, catalog_id, product_name, qty, price, total) VALUES
  (18, 3, '김치찌개 (Kimchi Jjigae)', 1, 14.99, 14.99),
  (18, 11, '만두 (Mandu) 10pc', 1, 10.99, 10.99);

INSERT INTO purchase_orders (customer_id, order_date, delivery_date, discount, discount_type, tax_hst, tax_hst_rate, payment_method, payment_status, paid_amount, subtotal, total, note, order_status, delivery_address, delivered) VALUES
  (3, '2026-02-18', '2026-02-19', 0, '$', 5.85, 13, 'CASH', 'Paid', 50.82, 44.97, 50.82, '', '', '200 University Ave, Toronto, ON M5H 3C6', 1);
INSERT INTO po_items (po_id, catalog_id, product_name, qty, price, total) VALUES
  (19, 12, '갈비탕 (Galbitang)', 1, 19.99, 19.99),
  (19, 5, '순두부찌개 (Sundubu Jjigae)', 1, 14.99, 14.99),
  (19, 14, '계란찜 (Steamed Egg)', 1, 8.99, 8.99);

INSERT INTO purchase_orders (customer_id, order_date, delivery_date, discount, discount_type, tax_hst, tax_hst_rate, payment_method, payment_status, paid_amount, subtotal, total, note, order_status, delivery_address, delivered) VALUES
  (7, '2026-02-19', '2026-02-20', 0, '$', 5.33, 13, 'E-transfer', 'Paid', 46.30, 40.97, 46.30, '', '', '1 Dundas St W, Toronto, ON M5G 1Z3', 1);
INSERT INTO po_items (po_id, catalog_id, product_name, qty, price, total) VALUES
  (20, 6, '제육볶음 (Jeyuk Bokkeum)', 1, 16.99, 16.99),
  (20, 7, '잡채 (Japchae)', 1, 14.99, 14.99),
  (20, 14, '계란찜 (Steamed Egg)', 1, 8.99, 8.99);

-- PO 21-25: Late February — some pending delivery
INSERT INTO purchase_orders (customer_id, order_date, delivery_date, discount, discount_type, tax_hst, tax_hst_rate, payment_method, payment_status, paid_amount, subtotal, total, note, order_status, delivery_address, delivered) VALUES
  (5, '2026-02-20', '2026-02-21', 0, '$', 8.06, 13, 'CASH', 'Paid', 70.00, 61.96, 70.01, 'Family dinner', '', '8 Olympic Garden Dr, North York, ON M2M 0B1', 1);
INSERT INTO po_items (po_id, catalog_id, product_name, qty, price, total) VALUES
  (21, 1, '불고기 정식 (Bulgogi Set)', 2, 18.99, 37.98),
  (21, 8, '닭볶음탕 (Dakbokkeum)', 1, 17.99, 17.99),
  (21, 14, '계란찜 (Steamed Egg)', 1, 8.99, 8.99);

INSERT INTO purchase_orders (customer_id, order_date, delivery_date, discount, discount_type, tax_hst, tax_hst_rate, payment_method, payment_status, paid_amount, subtotal, total, note, order_status, delivery_address, delivered) VALUES
  (8, '2026-02-22', '2026-02-23', 0, '$', 6.11, 13, 'E-transfer', 'Paid', 53.08, 46.97, 53.08, '', '', '770 Don Mills Rd, North York, ON M3C 1T3', 1);
INSERT INTO po_items (po_id, catalog_id, product_name, qty, price, total) VALUES
  (22, 1, '불고기 정식 (Bulgogi Set)', 1, 18.99, 18.99),
  (22, 3, '김치찌개 (Kimchi Jjigae)', 1, 14.99, 14.99),
  (22, 9, '김밥 세트 (Gimbap Set)', 1, 12.99, 12.99);

-- PO 23: I-02 케이터링 repeat
INSERT INTO purchase_orders (customer_id, order_date, delivery_date, discount, discount_type, tax_hst, tax_hst_rate, payment_method, payment_status, paid_amount, subtotal, total, note, order_status, delivery_address, delivered) VALUES
  (12, '2026-02-23', '2026-02-24', 8, '%', 34.32, 13, 'E-transfer', 'Partial', 150.00, 263.90, 298.21, '주간 납품 — 특대 주문', '', '5460 Yonge St, North York, ON M2N 6K7', 0);
INSERT INTO po_items (po_id, catalog_id, product_name, qty, price, total) VALUES
  (23, 1, '불고기 정식 (Bulgogi Set)', 8, 18.99, 151.92),
  (23, 2, '비빔밥 (Bibimbap)', 4, 15.99, 63.96),
  (23, 7, '잡채 (Japchae)', 2, 14.99, 29.98),
  (23, 14, '계란찜 (Steamed Egg)', 2, 8.99, 17.98),
  (23, 15, '공기밥 (Extra Rice)', 1, 2.50, 2.50);
INSERT INTO payment_log (po_id, amount, date, note) VALUES
  (23, 150.00, '2026-02-23', 'Deposit');

-- PO 24-27: Upcoming deliveries (not delivered yet)
INSERT INTO purchase_orders (customer_id, order_date, delivery_date, discount, discount_type, tax_hst, tax_hst_rate, payment_method, payment_status, paid_amount, subtotal, total, note, order_status, delivery_address, delivered) VALUES
  (1, '2026-02-25', '2026-02-27', 0, '$', 4.55, 13, 'CASH', 'Unpaid', 0, 34.98, 39.53, '', '', '120 Bloor St W, Toronto, ON M5S 1S4', 0);
INSERT INTO po_items (po_id, catalog_id, product_name, qty, price, total) VALUES
  (24, 1, '불고기 정식 (Bulgogi Set)', 1, 18.99, 18.99),
  (24, 5, '순두부찌개 (Sundubu Jjigae)', 1, 14.99, 14.99);

INSERT INTO purchase_orders (customer_id, order_date, delivery_date, discount, discount_type, tax_hst, tax_hst_rate, payment_method, payment_status, paid_amount, subtotal, total, note, order_status, delivery_address, delivered) VALUES
  (9, '2026-02-25', '2026-02-27', 0, '$', 2.47, 13, 'CASH', 'Unpaid', 0, 18.99, 21.46, '', '', '5985 Yonge St, North York, ON M2M 3V7', 0);
INSERT INTO po_items (po_id, catalog_id, product_name, qty, price, total) VALUES
  (25, 1, '불고기 정식 (Bulgogi Set)', 1, 18.99, 18.99);

INSERT INTO purchase_orders (customer_id, order_date, delivery_date, discount, discount_type, tax_hst, tax_hst_rate, payment_method, payment_status, paid_amount, subtotal, total, note, order_status, delivery_address, delivered) VALUES
  (4, '2026-02-26', '2026-02-28', 0, '$', 5.85, 13, 'E-transfer', 'Unpaid', 0, 44.97, 50.82, '', '', '55 Eglinton Ave E, Toronto, ON M4P 1G8', 0);
INSERT INTO po_items (po_id, catalog_id, product_name, qty, price, total) VALUES
  (26, 12, '갈비탕 (Galbitang)', 1, 19.99, 19.99),
  (26, 3, '김치찌개 (Kimchi Jjigae)', 1, 14.99, 14.99),
  (26, 14, '계란찜 (Steamed Egg)', 1, 8.99, 8.99);

INSERT INTO purchase_orders (customer_id, order_date, delivery_date, discount, discount_type, tax_hst, tax_hst_rate, payment_method, payment_status, paid_amount, subtotal, total, note, order_status, delivery_address, delivered) VALUES
  (10, '2026-02-26', '2026-02-28', 0, '$', 3.77, 13, 'CASH', 'Unpaid', 0, 28.98, 32.75, '', '', '2300 Yonge St, Toronto, ON M4P 1E4', 0);
INSERT INTO po_items (po_id, catalog_id, product_name, qty, price, total) VALUES
  (27, 2, '비빔밥 (Bibimbap)', 1, 15.99, 15.99),
  (27, 9, '김밥 세트 (Gimbap Set)', 1, 12.99, 12.99);

-- PO 28: GloriaFood style order (with order_status)
INSERT INTO purchase_orders (customer_id, order_date, delivery_date, discount, discount_type, tax_hst, tax_hst_rate, payment_method, payment_status, paid_amount, subtotal, total, note, order_status, delivery_address, delivered) VALUES
  (5, '2026-02-26', '2026-02-27', 0, '$', 4.42, 13, 'E-transfer', 'Paid', 38.40, 33.98, 38.40, '[GloriaFood delivery] | Fulfill: 2026-02-27 18:00', 'accepted', '8 Olympic Garden Dr, North York, ON M2M 0B1', 0);
INSERT INTO po_items (po_id, catalog_id, product_name, qty, price, total) VALUES
  (28, 1, '불고기 정식 (Bulgogi Set)', 1, 18.99, 18.99),
  (28, 7, '잡채 (Japchae)', 1, 14.99, 14.99);

-- PO 29: GloriaFood pending
INSERT INTO purchase_orders (customer_id, order_date, delivery_date, discount, discount_type, tax_hst, tax_hst_rate, payment_method, payment_status, paid_amount, subtotal, total, note, order_status, delivery_address, delivered) VALUES
  (6, '2026-02-27', '2026-02-27', 0, '$', 3.51, 13, 'CASH', 'Unpaid', 0, 26.98, 30.49, '[GloriaFood delivery] | Fulfill: 2026-02-27 19:00', 'pending', '3401 Dufferin St, North York, ON M6A 2T9', 0);
INSERT INTO po_items (po_id, catalog_id, product_name, qty, price, total) VALUES
  (29, 3, '김치찌개 (Kimchi Jjigae)', 1, 14.99, 14.99),
  (29, 10, '떡볶이 (Tteokbokki)', 1, 11.99, 11.99);

-- PO 30: GloriaFood cancelled (for testing cancelled display)
INSERT INTO purchase_orders (customer_id, order_date, delivery_date, discount, discount_type, tax_hst, tax_hst_rate, payment_method, payment_status, paid_amount, subtotal, total, note, order_status, delivery_address, delivered) VALUES
  (7, '2026-02-27', '2026-02-27', 0, '$', 0, 13, 'CASH', 'Unpaid', 0, 0, 0, '[GloriaFood pickup] | ⛔ CANCELLED', 'canceled', '1 Dundas St W, Toronto, ON M5G 1Z3', 0);

-- ============================================================
-- EXPENSES (15 entries — various categories for T2125)
-- ============================================================
INSERT INTO expenses (name, amount, date, note, receipt_path, tax_hst, tax_hst_rate) VALUES
  ('Rent', 3500.00, '2026-01-01', 'January rent — 456 Yonge St', '', 0, 0),
  ('H-Mart 식자재', 850.00, '2026-01-05', '쌀, 고추장, 된장, 각종 양념', '', 110.50, 13),
  ('Costco 고기', 620.00, '2026-01-05', '소고기, 돼지고기, 닭고기 대량', '', 80.60, 13),
  ('Utility — Hydro', 180.00, '2026-01-15', 'Toronto Hydro', '', 23.40, 13),
  ('Utility — Gas', 220.00, '2026-01-15', 'Enbridge Gas', '', 28.60, 13),
  ('Insurance', 450.00, '2026-01-20', 'Business liability insurance', '', 0, 0),
  ('Kitchen Supplies', 320.00, '2026-01-22', '일회용 용기, 비닐, 수저 등', '', 41.60, 13),
  ('Rent', 3500.00, '2026-02-01', 'February rent', '', 0, 0),
  ('H-Mart 식자재', 780.00, '2026-02-01', '쌀, 야채, 양념 등', '', 101.40, 13),
  ('Costco 고기', 550.00, '2026-02-01', '소고기, 돼지고기', '', 71.50, 13),
  ('Utility — Hydro', 195.00, '2026-02-15', 'Toronto Hydro', '', 25.35, 13),
  ('Utility — Gas', 240.00, '2026-02-15', 'Enbridge Gas — winter surcharge', '', 31.20, 13),
  ('Vehicle — Gas', 180.00, '2026-02-10', '배달 차량 주유', '', 23.40, 13),
  ('Vehicle — Maintenance', 350.00, '2026-02-18', '오일체인지 + 타이어', '', 45.50, 13),
  ('Marketing', 200.00, '2026-02-20', 'Instagram ads + 전단지 인쇄', '', 26.00, 13);

-- ============================================================
-- PAYMENT LOG for paid orders (those not already logged above)
-- ============================================================
INSERT INTO payment_log (po_id, amount, date, note) VALUES
  (1, 39.53, '2026-01-09', 'Cash received'),
  (2, 50.82, '2026-01-11', 'E-transfer'),
  (4, 0, '2026-01-16', ''),  -- will be deleted, just placeholder
  (5, 46.30, '2026-01-19', 'Cash'),
  (6, 60.99, '2026-01-21', 'E-transfer'),
  (7, 29.36, '2026-01-23', 'Cash'),
  (9, 22.58, '2026-01-29', 'Cash'),
  (10, 22.58, '2026-01-31', 'E-transfer'),
  (11, 55.34, '2026-02-03', 'Cash'),
  (13, 38.40, '2026-02-08', 'Cash'),
  (14, 35.01, '2026-02-09', 'E-transfer'),
  (16, 38.40, '2026-02-13', 'Cash'),
  (19, 50.82, '2026-02-19', 'Cash'),
  (20, 46.30, '2026-02-20', 'E-transfer'),
  (21, 70.01, '2026-02-21', 'Cash'),
  (22, 53.08, '2026-02-23', 'E-transfer'),
  (28, 38.40, '2026-02-27', 'GloriaFood online payment');

-- Remove the zero placeholder
DELETE FROM payment_log WHERE po_id=4 AND amount=0;

-- ============================================================
-- GLORIAFOOD ORDERS (dedup table — 3 entries to show history)
-- ============================================================
INSERT INTO glf_orders (glf_order_id, po_id, customer_name, total, order_type, payment, status, raw_json) VALUES
  ('GLF-2026-0228', 28, 'David Kim', 38.40, 'delivery', 'ONLINE', 'accepted', '{}'),
  ('GLF-2026-0229', 29, 'Sarah Park', 30.49, 'delivery', 'CASH', 'pending', '{}'),
  ('GLF-2026-0230', 30, '최유진', 0, 'pickup', 'CASH', 'cancelled', '{}');

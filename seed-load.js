/**
 * 나만의 경영박사 — Sample Data Loader
 * 
 * Usage:
 *   node seed-load.js
 * 
 * This script loads sample data (한식당 "서울맛집") into the app's database.
 * Run ONCE on a fresh database. Running on existing data may cause duplicates.
 */

const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

// Find the DB path (same location the app uses)
const userHome = process.env.APPDATA || process.env.HOME;
let dbPath = path.join(userHome, 'gyeongyang-baksa', 'inventory.sqlite');
if (!fs.existsSync(dbPath)) {
  dbPath = path.join(userHome, 'my-business-doctor', 'inventory.sqlite');
}

if (!fs.existsSync(dbPath)) {
  console.error('❌ Database not found at:', dbPath);
  console.log('Please run the app once first to create the database, then run this script.');
  process.exit(1);
}

console.log('📂 Database:', dbPath);
const db = new Database(dbPath);

try {
  // ============================================================
  // COMPANY INFO
  // ============================================================
  db.exec(`UPDATE company_info SET
    name='서울맛집 Korean Kitchen',
    address='456 Yonge Street, Toronto, ON M4Y 1W9',
    contact='416-555-0123 | info@seoulmatjip.ca',
    notes='Since 2023 — Authentic Korean Home Cooking',
    tax_gst=0, tax_pst=0, tax_hst=13
  WHERE id=1`);
  console.log('✅ Company info updated');

  // ============================================================
  // RAW MATERIAL DB
  // ============================================================
  const matDbNames = [
    '쌀 (Rice)','고추장 (Gochujang)','된장 (Doenjang)','간장 (Soy Sauce)',
    '참기름 (Sesame Oil)','고춧가루 (Chili Flakes)','마늘 (Garlic)','양파 (Onion)',
    '소고기 (Beef)','돼지고기 (Pork)','닭고기 (Chicken)','두부 (Tofu)',
    '배추 (Napa Cabbage)','무 (Radish)','당면 (Glass Noodles)','김 (Seaweed)',
    '계란 (Eggs)','시금치 (Spinach)','콩나물 (Bean Sprouts)','설탕 (Sugar)'
  ];
  const insMatDb = db.prepare('INSERT OR IGNORE INTO material_db (name) VALUES (?)');
  for (const n of matDbNames) insMatDb.run(n);
  console.log('✅ Material DB: 20 ingredients');

  // ============================================================
  // MATERIALS (inventory)
  // ============================================================
  const materials = [
    ['쌀 (Rice)', 45.0, 'Kg', 10], ['고추장 (Gochujang)', 8.5, 'Kg', 3],
    ['된장 (Doenjang)', 6.0, 'Kg', 2], ['간장 (Soy Sauce)', 12.0, 'Bottle', 3],
    ['참기름 (Sesame Oil)', 4.0, 'Bottle', 2], ['고춧가루 (Chili Flakes)', 3.5, 'Kg', 1],
    ['마늘 (Garlic)', 5.0, 'Kg', 2], ['양파 (Onion)', 15.0, 'Kg', 5],
    ['소고기 (Beef)', 22.0, 'Kg', 8], ['돼지고기 (Pork)', 18.0, 'Kg', 6],
    ['닭고기 (Chicken)', 14.0, 'Kg', 5], ['두부 (Tofu)', 20.0, 'Box', 5],
    ['배추 (Napa Cabbage)', 25.0, 'Kg', 8], ['무 (Radish)', 10.0, 'Kg', 3],
    ['당면 (Glass Noodles)', 6.0, 'Kg', 2], ['김 (Seaweed)', 30.0, 'Box', 5],
    ['계란 (Eggs)', 120.0, 'NMB', 30], ['시금치 (Spinach)', 4.0, 'Kg', 2],
    ['콩나물 (Bean Sprouts)', 8.0, 'Kg', 3], ['설탕 (Sugar)', 5.0, 'Kg', 2]
  ];
  const insMat = db.prepare('INSERT INTO materials (material_db_id, name, quantity, uom, alert_qty) VALUES ((SELECT id FROM material_db WHERE name=?), ?, ?, ?, ?)');
  for (const [n, q, u, a] of materials) insMat.run(n, n, q, u, a);
  console.log('✅ Materials: 20 items');

  // ============================================================
  // MATERIAL LOG
  // ============================================================
  const matLogs = [
    [1,'add',50,0,50,'2026-01-05','H-Mart 대량구매'],[9,'add',30,0,30,'2026-01-05','Costco beef bulk'],
    [10,'add',25,0,25,'2026-01-05','Costco pork bulk'],[11,'add',20,0,20,'2026-01-05','PAT Mart'],
    [13,'add',30,0,30,'2026-01-06','배추 한박스'],[17,'add',180,0,180,'2026-01-06','계란 15판'],
    [2,'add',10,0,10,'2026-01-07','고추장 대용량'],[3,'add',8,0,8,'2026-01-07','된장 대용량'],
    [1,'use',8,50,42,'2026-01-10','1주 사용'],[9,'use',5,30,25,'2026-01-10','불고기용'],
    [10,'use',4,25,21,'2026-01-10','제육용'],[17,'use',30,180,150,'2026-01-10','비빔밥/계란찜'],
    [1,'use',7,42,35,'2026-01-17','2주 사용'],[9,'use',6,25,19,'2026-01-17','불고기'],
    [11,'use',4,20,16,'2026-01-17','닭볶음탕'],[13,'use',8,30,22,'2026-01-17','김치 담금'],
    [1,'add',20,35,55,'2026-02-01','H-Mart'],[9,'add',15,19,34,'2026-02-01','Costco'],
    [10,'add',10,21,31,'2026-02-01','Costco'],[17,'add',60,150,210,'2026-02-03','계란 5판'],
    [15,'add',8,0,8,'2026-02-03','당면'],[12,'add',25,0,25,'2026-02-03','두부'],
    [1,'use',10,55,45,'2026-02-10','2주 사용'],[9,'use',12,34,22,'2026-02-10','불고기 대량'],
    [10,'use',13,31,18,'2026-02-14','제육+김치찌개'],[11,'use',6,16,10,'2026-02-14','닭볶음탕'],
    [17,'use',90,210,120,'2026-02-20','2주 사용'],[12,'use',5,25,20,'2026-02-20','순두부찌개'],
    [15,'use',2,8,6,'2026-02-20','잡채'],[13,'use',5,22,17,'2026-02-20','김치찌개'],
    [18,'use',2,6,4,'2026-02-22','나물'],[19,'use',5,13,8,'2026-02-22','콩나물국']
  ];
  const insLog = db.prepare('INSERT INTO material_log (material_id,type,qty,prev_qty,new_qty,date,note) VALUES (?,?,?,?,?,?,?)');
  for (const l of matLogs) insLog.run(...l);
  console.log('✅ Material logs: 32 entries');

  // ============================================================
  // CATALOG (menu)
  // ============================================================
  const catalog = [
    ['불고기 정식 (Bulgogi Set)',18.99,'Best seller'],['비빔밥 (Bibimbap)',15.99,'Mixed rice'],
    ['김치찌개 (Kimchi Jjigae)',14.99,'Spicy kimchi stew'],['된장찌개 (Doenjang Jjigae)',13.99,'Soybean paste stew'],
    ['순두부찌개 (Sundubu Jjigae)',14.99,'Soft tofu stew'],['제육볶음 (Jeyuk Bokkeum)',16.99,'Spicy pork'],
    ['잡채 (Japchae)',14.99,'Glass noodle stir-fry'],['닭볶음탕 (Dakbokkeum)',17.99,'Braised chicken'],
    ['김밥 세트 (Gimbap Set)',12.99,'2 rolls'],['떡볶이 (Tteokbokki)',11.99,'Spicy rice cakes'],
    ['만두 (Mandu) 10pc',10.99,'Pan-fried dumplings'],['갈비탕 (Galbitang)',19.99,'Short rib soup'],
    ['김치전 (Kimchi Pancake)',12.99,'Crispy pancake'],['계란찜 (Steamed Egg)',8.99,'Side dish'],
    ['공기밥 (Extra Rice)',2.50,'Additional rice']
  ];
  const insCat = db.prepare('INSERT INTO catalog (name,price,note) VALUES (?,?,?)');
  for (const c of catalog) insCat.run(...c);
  console.log('✅ Catalog: 15 menu items');

  // ============================================================
  // CUSTOMERS
  // ============================================================
  const customers = [
    ['C-01','individual','김민수','416-555-1001','120 Bloor St W, Toronto, ON M5S 1S4',0,43.6706,-79.3929],
    ['C-02','individual','박지영','416-555-1002','88 Queens Quay W, Toronto, ON M5J 0B6',0,43.6389,-79.3815],
    ['C-03','individual','이승호','647-555-1003','200 University Ave, Toronto, ON M5H 3C6',0,43.6513,-79.3845],
    ['C-04','individual','정수진','416-555-1004','55 Eglinton Ave E, Toronto, ON M4P 1G8',0,43.7079,-79.3984],
    ['C-05','individual','David Kim','647-555-1005','8 Olympic Garden Dr, North York, ON M2M 0B1',0,43.7935,-79.4153],
    ['C-06','individual','Sarah Park','416-555-1006','3401 Dufferin St, North York, ON M6A 2T9',0,43.7282,-79.4510],
    ['C-07','individual','최유진','647-555-1007','1 Dundas St W, Toronto, ON M5G 1Z3',0,43.6561,-79.3817],
    ['C-08','individual','Tom Lee','416-555-1008','770 Don Mills Rd, North York, ON M3C 1T3',0,43.7274,-79.3440],
    ['C-09','individual','한소희','647-555-1009','5985 Yonge St, North York, ON M2M 3V7',0,43.7970,-79.4176],
    ['C-10','individual','James Cho','416-555-1010','2300 Yonge St, Toronto, ON M4P 1E4',0,43.7092,-79.3985],
    ['I-01','business','Korean Culture Centre','416-555-2001','1133 Leslie St, North York, ON M3C 2J6',10,43.7231,-79.3348],
    ['I-02','business','Toronto K-Food Catering','647-555-2002','5460 Yonge St, North York, ON M2N 6K7',8,43.7867,-79.4149],
    ['I-03','business','U of T Korean Student Assoc.','416-555-2003','21 Sussex Ave, Toronto, ON M5S 1J6',15,43.6633,-79.3957]
  ];
  const insCust = db.prepare('INSERT INTO customers (cust_id,type,name,phone,address,discount_rate,lat,lng) VALUES (?,?,?,?,?,?,?,?)');
  for (const c of customers) insCust.run(...c);
  console.log('✅ Customers: 13 (10 individual + 3 business)');

  // ============================================================
  // PURCHASE ORDERS + ITEMS
  // ============================================================
  const insPO = db.prepare(`INSERT INTO purchase_orders 
    (customer_id,order_date,delivery_date,discount,discount_type,tax_hst,tax_hst_rate,payment_method,payment_status,paid_amount,subtotal,total,note,order_status,delivery_address,delivered) 
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  const insItem = db.prepare('INSERT INTO po_items (po_id,catalog_id,product_name,qty,price,total) VALUES (?,?,?,?,?,?)');
  const insPay = db.prepare('INSERT INTO payment_log (po_id,amount,date,note) VALUES (?,?,?,?)');

  const orders = [
    {c:1,od:'2026-01-08',dd:'2026-01-09',dis:0,dt:'$',hst:4.55,hr:13,pm:'CASH',ps:'Paid',pa:39.53,sub:34.98,tot:39.53,n:'',os:'',addr:'120 Bloor St W, Toronto, ON M5S 1S4',del:1,
     items:[[1,'불고기 정식 (Bulgogi Set)',1,18.99],[2,'비빔밥 (Bibimbap)',1,15.99]], pays:[['2026-01-09','Cash received']]},
    {c:2,od:'2026-01-10',dd:'2026-01-11',dis:0,dt:'$',hst:5.85,hr:13,pm:'E-transfer',ps:'Paid',pa:50.82,sub:44.97,tot:50.82,n:'',os:'',addr:'88 Queens Quay W, Toronto, ON M5J 0B6',del:1,
     items:[[3,'김치찌개 (Kimchi Jjigae)',2,14.99],[2,'비빔밥 (Bibimbap)',1,15.99]], pays:[['2026-01-11','E-transfer']]},
    {c:11,od:'2026-01-12',dd:'2026-01-13',dis:10,dt:'%',hst:20.79,hr:13,pm:'E-transfer',ps:'Partial',pa:100,sub:159.90,tot:180.69,n:'문화센터 행사 케이터링',os:'',addr:'1133 Leslie St, North York, ON M3C 2J6',del:1,
     items:[[1,'불고기 정식 (Bulgogi Set)',5,18.99],[7,'잡채 (Japchae)',3,14.99],[14,'계란찜 (Steamed Egg)',2,8.99],[15,'공기밥 (Extra Rice)',1,2.50]], pays:[['2026-01-12','Deposit e-transfer']]},
    {c:3,od:'2026-01-15',dd:'2026-01-16',dis:0,dt:'$',hst:3.90,hr:13,pm:'CASH',ps:'Unpaid',pa:0,sub:29.98,tot:33.88,n:'',os:'',addr:'200 University Ave, Toronto, ON M5H 3C6',del:1,
     items:[[6,'제육볶음 (Jeyuk Bokkeum)',1,16.99],[4,'된장찌개 (Doenjang Jjigae)',1,13.99]], pays:[]},
    {c:4,od:'2026-01-18',dd:'2026-01-19',dis:0,dt:'$',hst:5.33,hr:13,pm:'CASH',ps:'Paid',pa:46.30,sub:40.97,tot:46.30,n:'',os:'',addr:'55 Eglinton Ave E, Toronto, ON M4P 1G8',del:1,
     items:[[8,'닭볶음탕 (Dakbokkeum)',1,17.99],[10,'떡볶이 (Tteokbokki)',1,11.99],[11,'만두 (Mandu) 10pc',1,10.99]], pays:[['2026-01-19','Cash']]},
    {c:5,od:'2026-01-20',dd:'2026-01-21',dis:0,dt:'$',hst:7.02,hr:13,pm:'E-transfer',ps:'Paid',pa:60.99,sub:53.97,tot:60.99,n:'Birthday party',os:'',addr:'8 Olympic Garden Dr, North York, ON M2M 0B1',del:1,
     items:[[1,'불고기 정식 (Bulgogi Set)',2,18.99],[2,'비빔밥 (Bibimbap)',1,15.99]], pays:[['2026-01-21','E-transfer']]},
    {c:6,od:'2026-01-22',dd:'2026-01-23',dis:0,dt:'$',hst:3.38,hr:13,pm:'CASH',ps:'Paid',pa:29.36,sub:25.98,tot:29.36,n:'',os:'',addr:'3401 Dufferin St, North York, ON M6A 2T9',del:1,
     items:[[9,'김밥 세트 (Gimbap Set)',2,12.99]], pays:[['2026-01-23','Cash']]},
    {c:12,od:'2026-01-25',dd:'2026-01-26',dis:8,dt:'%',hst:28.60,hr:13,pm:'E-transfer',ps:'Paid',pa:248.57,sub:219.90,tot:248.57,n:'주간 케이터링 납품',os:'',addr:'5460 Yonge St, North York, ON M2N 6K7',del:1,
     items:[[1,'불고기 정식 (Bulgogi Set)',5,18.99],[3,'김치찌개 (Kimchi Jjigae)',5,14.99],[7,'잡채 (Japchae)',2,14.99],[14,'계란찜 (Steamed Egg)',2,8.99],[15,'공기밥 (Extra Rice)',1,2.50]], pays:[['2026-01-26','E-transfer 완료']]},
    {c:7,od:'2026-01-28',dd:'2026-01-29',dis:0,dt:'$',hst:2.60,hr:13,pm:'CASH',ps:'Paid',pa:22.58,sub:19.98,tot:22.58,n:'',os:'',addr:'1 Dundas St W, Toronto, ON M5G 1Z3',del:1,
     items:[[13,'김치전 (Kimchi Pancake)',1,12.99],[14,'계란찜 (Steamed Egg)',1,8.99]], pays:[['2026-01-29','Cash']]},
    {c:8,od:'2026-01-30',dd:'2026-01-31',dis:0,dt:'$',hst:2.60,hr:13,pm:'E-transfer',ps:'Paid',pa:22.58,sub:19.99,tot:22.59,n:'',os:'',addr:'770 Don Mills Rd, North York, ON M3C 1T3',del:1,
     items:[[12,'갈비탕 (Galbitang)',1,19.99]], pays:[['2026-01-31','E-transfer']]},
    {c:1,od:'2026-02-02',dd:'2026-02-03',dis:0,dt:'$',hst:6.37,hr:13,pm:'CASH',ps:'Paid',pa:55.34,sub:48.97,tot:55.34,n:'',os:'',addr:'120 Bloor St W, Toronto, ON M5S 1S4',del:1,
     items:[[1,'불고기 정식 (Bulgogi Set)',1,18.99],[5,'순두부찌개 (Sundubu Jjigae)',1,14.99],[2,'비빔밥 (Bibimbap)',1,15.99]], pays:[['2026-02-03','Cash']]},
    {c:13,od:'2026-02-05',dd:'2026-02-06',dis:15,dt:'%',hst:23.44,hr:13,pm:'E-transfer',ps:'Paid',pa:203.77,sub:180.35,tot:203.77,n:'유학생 모임 50명',os:'',addr:'21 Sussex Ave, Toronto, ON M5S 1J6',del:1,
     items:[[2,'비빔밥 (Bibimbap)',5,15.99],[9,'김밥 세트 (Gimbap Set)',5,12.99],[10,'떡볶이 (Tteokbokki)',3,11.99]], pays:[['2026-02-06','U of T e-transfer']]},
    {c:9,od:'2026-02-07',dd:'2026-02-08',dis:0,dt:'$',hst:4.42,hr:13,pm:'CASH',ps:'Paid',pa:38.40,sub:33.98,tot:38.40,n:'',os:'',addr:'5985 Yonge St, North York, ON M2M 3V7',del:1,
     items:[[1,'불고기 정식 (Bulgogi Set)',1,18.99],[7,'잡채 (Japchae)',1,14.99]], pays:[['2026-02-08','Cash']]},
    {c:10,od:'2026-02-08',dd:'2026-02-09',dis:0,dt:'$',hst:4.03,hr:13,pm:'E-transfer',ps:'Paid',pa:35.01,sub:30.98,tot:35.01,n:'',os:'',addr:'2300 Yonge St, Toronto, ON M4P 1E4',del:0,
     items:[[6,'제육볶음 (Jeyuk Bokkeum)',1,16.99],[4,'된장찌개 (Doenjang Jjigae)',1,13.99]], pays:[['2026-02-09','E-transfer']]},
    {c:11,od:'2026-02-10',dd:'2026-02-11',dis:10,dt:'%',hst:16.60,hr:13,pm:'E-transfer',ps:'Unpaid',pa:0,sub:127.90,tot:144.50,n:'설날 특별 행사',os:'',addr:'1133 Leslie St, North York, ON M3C 2J6',del:0,
     items:[[12,'갈비탕 (Galbitang)',4,19.99],[1,'불고기 정식 (Bulgogi Set)',2,18.99],[14,'계란찜 (Steamed Egg)',1,8.99],[15,'공기밥 (Extra Rice)',1,2.50]], pays:[]},
    {c:2,od:'2026-02-12',dd:'2026-02-13',dis:0,dt:'$',hst:4.42,hr:13,pm:'CASH',ps:'Paid',pa:38.40,sub:33.98,tot:38.40,n:'',os:'',addr:'88 Queens Quay W, Toronto, ON M5J 0B6',del:1,
     items:[[8,'닭볶음탕 (Dakbokkeum)',1,17.99],[2,'비빔밥 (Bibimbap)',1,15.99]], pays:[['2026-02-13','Cash']]},
    {c:4,od:'2026-02-14',dd:'2026-02-15',dis:0,dt:'$',hst:4.94,hr:13,pm:'E-transfer',ps:'Paid',pa:42.92,sub:37.98,tot:42.92,n:'Valentine special',os:'',addr:'55 Eglinton Ave E, Toronto, ON M4P 1G8',del:1,
     items:[[1,'불고기 정식 (Bulgogi Set)',2,18.99]], pays:[['2026-02-14','Valentine e-transfer']]},
    {c:6,od:'2026-02-16',dd:'2026-02-17',dis:0,dt:'$',hst:3.38,hr:13,pm:'CASH',ps:'Unpaid',pa:0,sub:25.98,tot:29.36,n:'',os:'',addr:'3401 Dufferin St, North York, ON M6A 2T9',del:0,
     items:[[3,'김치찌개 (Kimchi Jjigae)',1,14.99],[11,'만두 (Mandu) 10pc',1,10.99]], pays:[]},
    {c:3,od:'2026-02-18',dd:'2026-02-19',dis:0,dt:'$',hst:5.85,hr:13,pm:'CASH',ps:'Paid',pa:50.82,sub:44.97,tot:50.82,n:'',os:'',addr:'200 University Ave, Toronto, ON M5H 3C6',del:1,
     items:[[12,'갈비탕 (Galbitang)',1,19.99],[5,'순두부찌개 (Sundubu Jjigae)',1,14.99],[14,'계란찜 (Steamed Egg)',1,8.99]], pays:[['2026-02-19','Cash']]},
    {c:7,od:'2026-02-19',dd:'2026-02-20',dis:0,dt:'$',hst:5.33,hr:13,pm:'E-transfer',ps:'Paid',pa:46.30,sub:40.97,tot:46.30,n:'',os:'',addr:'1 Dundas St W, Toronto, ON M5G 1Z3',del:1,
     items:[[6,'제육볶음 (Jeyuk Bokkeum)',1,16.99],[7,'잡채 (Japchae)',1,14.99],[14,'계란찜 (Steamed Egg)',1,8.99]], pays:[['2026-02-20','E-transfer']]},
    {c:5,od:'2026-02-20',dd:'2026-02-21',dis:0,dt:'$',hst:8.06,hr:13,pm:'CASH',ps:'Paid',pa:70.01,sub:61.96,tot:70.02,n:'Family dinner',os:'',addr:'8 Olympic Garden Dr, North York, ON M2M 0B1',del:1,
     items:[[1,'불고기 정식 (Bulgogi Set)',2,18.99],[8,'닭볶음탕 (Dakbokkeum)',1,17.99],[14,'계란찜 (Steamed Egg)',1,8.99]], pays:[['2026-02-21','Cash']]},
    {c:8,od:'2026-02-22',dd:'2026-02-23',dis:0,dt:'$',hst:6.11,hr:13,pm:'E-transfer',ps:'Paid',pa:53.08,sub:46.97,tot:53.08,n:'',os:'',addr:'770 Don Mills Rd, North York, ON M3C 1T3',del:1,
     items:[[1,'불고기 정식 (Bulgogi Set)',1,18.99],[3,'김치찌개 (Kimchi Jjigae)',1,14.99],[9,'김밥 세트 (Gimbap Set)',1,12.99]], pays:[['2026-02-23','E-transfer']]},
    {c:12,od:'2026-02-23',dd:'2026-02-24',dis:8,dt:'%',hst:34.32,hr:13,pm:'E-transfer',ps:'Partial',pa:150,sub:263.90,tot:298.21,n:'주간 납품 — 특대 주문',os:'',addr:'5460 Yonge St, North York, ON M2N 6K7',del:0,
     items:[[1,'불고기 정식 (Bulgogi Set)',8,18.99],[2,'비빔밥 (Bibimbap)',4,15.99],[7,'잡채 (Japchae)',2,14.99],[14,'계란찜 (Steamed Egg)',2,8.99],[15,'공기밥 (Extra Rice)',1,2.50]], pays:[['2026-02-23','Deposit']]},
    {c:1,od:'2026-02-25',dd:'2026-02-27',dis:0,dt:'$',hst:4.55,hr:13,pm:'CASH',ps:'Unpaid',pa:0,sub:34.98,tot:39.53,n:'',os:'',addr:'120 Bloor St W, Toronto, ON M5S 1S4',del:0,
     items:[[1,'불고기 정식 (Bulgogi Set)',1,18.99],[5,'순두부찌개 (Sundubu Jjigae)',1,14.99]], pays:[]},
    {c:9,od:'2026-02-25',dd:'2026-02-27',dis:0,dt:'$',hst:2.47,hr:13,pm:'CASH',ps:'Unpaid',pa:0,sub:18.99,tot:21.46,n:'',os:'',addr:'5985 Yonge St, North York, ON M2M 3V7',del:0,
     items:[[1,'불고기 정식 (Bulgogi Set)',1,18.99]], pays:[]},
    {c:4,od:'2026-02-26',dd:'2026-02-28',dis:0,dt:'$',hst:5.85,hr:13,pm:'E-transfer',ps:'Unpaid',pa:0,sub:44.97,tot:50.82,n:'',os:'',addr:'55 Eglinton Ave E, Toronto, ON M4P 1G8',del:0,
     items:[[12,'갈비탕 (Galbitang)',1,19.99],[3,'김치찌개 (Kimchi Jjigae)',1,14.99],[14,'계란찜 (Steamed Egg)',1,8.99]], pays:[]},
    {c:10,od:'2026-02-26',dd:'2026-02-28',dis:0,dt:'$',hst:3.77,hr:13,pm:'CASH',ps:'Unpaid',pa:0,sub:28.98,tot:32.75,n:'',os:'',addr:'2300 Yonge St, Toronto, ON M4P 1E4',del:0,
     items:[[2,'비빔밥 (Bibimbap)',1,15.99],[9,'김밥 세트 (Gimbap Set)',1,12.99]], pays:[]},
    {c:5,od:'2026-02-26',dd:'2026-02-27',dis:0,dt:'$',hst:4.42,hr:13,pm:'E-transfer',ps:'Paid',pa:38.40,sub:33.98,tot:38.40,n:'[GloriaFood delivery] | Fulfill: 2026-02-27 18:00',os:'accepted',addr:'8 Olympic Garden Dr, North York, ON M2M 0B1',del:0,
     items:[[1,'불고기 정식 (Bulgogi Set)',1,18.99],[7,'잡채 (Japchae)',1,14.99]], pays:[['2026-02-27','GloriaFood online']]},
    {c:6,od:'2026-02-27',dd:'2026-02-27',dis:0,dt:'$',hst:3.51,hr:13,pm:'CASH',ps:'Unpaid',pa:0,sub:26.98,tot:30.49,n:'[GloriaFood delivery] | Fulfill: 2026-02-27 19:00',os:'pending',addr:'3401 Dufferin St, North York, ON M6A 2T9',del:0,
     items:[[3,'김치찌개 (Kimchi Jjigae)',1,14.99],[10,'떡볶이 (Tteokbokki)',1,11.99]], pays:[]},
    {c:7,od:'2026-02-27',dd:'2026-02-27',dis:0,dt:'$',hst:0,hr:13,pm:'CASH',ps:'Unpaid',pa:0,sub:0,tot:0,n:'[GloriaFood pickup] | CANCELLED',os:'canceled',addr:'1 Dundas St W, Toronto, ON M5G 1Z3',del:0,
     items:[], pays:[]}
  ];

  const txn = db.transaction(() => {
    for (const o of orders) {
      const r = insPO.run(o.c,o.od,o.dd,o.dis,o.dt,o.hst,o.hr,o.pm,o.ps,o.pa,o.sub,o.tot,o.n,o.os,o.addr,o.del);
      const poId = r.lastInsertRowid;
      for (const [catId,name,qty,price] of o.items) {
        insItem.run(poId, catId, name, qty, price, qty*price);
      }
      for (const [date,note] of o.pays) {
        insPay.run(poId, o.pa > 0 ? (o.pays.length === 1 ? o.pa : o.pa) : 0, date, note);
      }
    }
  });
  txn();
  console.log('✅ Purchase orders: 30 orders with items & payments');

  // ============================================================
  // EXPENSES
  // ============================================================
  const expenses = [
    ['Rent',3500,'2026-01-01','January rent',0,0],
    ['H-Mart 식자재',850,'2026-01-05','쌀, 고추장, 된장',110.50,13],
    ['Costco 고기',620,'2026-01-05','소고기, 돼지고기, 닭고기',80.60,13],
    ['Utility — Hydro',180,'2026-01-15','Toronto Hydro',23.40,13],
    ['Utility — Gas',220,'2026-01-15','Enbridge Gas',28.60,13],
    ['Insurance',450,'2026-01-20','Business liability',0,0],
    ['Kitchen Supplies',320,'2026-01-22','일회용 용기, 비닐, 수저',41.60,13],
    ['Rent',3500,'2026-02-01','February rent',0,0],
    ['H-Mart 식자재',780,'2026-02-01','쌀, 야채, 양념',101.40,13],
    ['Costco 고기',550,'2026-02-01','소고기, 돼지고기',71.50,13],
    ['Utility — Hydro',195,'2026-02-15','Toronto Hydro',25.35,13],
    ['Utility — Gas',240,'2026-02-15','Enbridge Gas winter',31.20,13],
    ['Vehicle — Gas',180,'2026-02-10','배달 차량 주유',23.40,13],
    ['Vehicle — Maintenance',350,'2026-02-18','오일체인지 + 타이어',45.50,13],
    ['Marketing',200,'2026-02-20','Instagram ads + 전단지',26.00,13]
  ];
  const insExp = db.prepare('INSERT INTO expenses (name,amount,date,note,tax_hst,tax_hst_rate) VALUES (?,?,?,?,?,?)');
  for (const e of expenses) insExp.run(...e);
  console.log('✅ Expenses: 15 entries');

  // ============================================================
  // GLORIAFOOD ORDERS (dedup table)
  // ============================================================
  // Find the last 3 PO IDs for GloriaFood orders
  const lastPOs = db.prepare("SELECT id FROM purchase_orders ORDER BY id DESC LIMIT 3").all();
  if (lastPOs.length >= 3) {
    const insGlf = db.prepare('INSERT INTO glf_orders (glf_order_id,po_id,customer_name,total,order_type,payment,status,raw_json) VALUES (?,?,?,?,?,?,?,?)');
    insGlf.run('GLF-2026-0228', lastPOs[2].id, 'David Kim', 38.40, 'delivery', 'ONLINE', 'accepted', '{}');
    insGlf.run('GLF-2026-0229', lastPOs[1].id, 'Sarah Park', 30.49, 'delivery', 'CASH', 'pending', '{}');
    insGlf.run('GLF-2026-0230', lastPOs[0].id, '최유진', 0, 'pickup', 'CASH', 'cancelled', '{}');
    console.log('✅ GloriaFood orders: 3 entries');
  }

  console.log('\n🎉 Sample data loaded successfully!');
  console.log('   Restart the app to see the data.');

} catch (err) {
  console.error('❌ Error:', err.message);
} finally {
  db.close();
}

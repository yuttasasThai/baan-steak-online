# Security Specification

## 1. Data Invariants
1. `name` must be a non-empty string with maximum length 120 characters.
2. `price` must be a positive number (price >= 0).
3. `category` must be a valid non-empty string with maximum length 60 characters.
4. `isAvailable` must be a boolean flag (`true` = available, `false` = temporarily out of stock).
5. `isPublished` must be a boolean flag (`true` = shown on customer website, `false` = draft/hidden).
6. `orderIndex` must be a non-negative number.
7. `imageUrl` must be a string up to 1000 characters if present.
8. `description` must be a string up to 800 characters if present.
9. Menus and categories are publicly readable so customers can browse dishes in real-time.
10. Writes (create/update/delete) require valid document structures conforming to field validation rules.

## 2. Dirty Dozen Payloads (Rejection Targets)
1. Missing `name`: `{ price: 350, category: "สเต็ก", isAvailable: true, isPublished: true, orderIndex: 0 }` -> REJECT
2. Negative `price`: `{ name: "Ribeye", price: -100, category: "สเต็ก", isAvailable: true, isPublished: true, orderIndex: 0 }` -> REJECT
3. Non-string `name`: `{ name: 12345, price: 350, category: "สเต็ก", isAvailable: true, isPublished: true, orderIndex: 0 }` -> REJECT
4. Excessively long `name` (>120 chars): `{ name: "A".repeat(150), price: 350, category: "สเต็ก", isAvailable: true, isPublished: true, orderIndex: 0 }` -> REJECT
5. Excessively long `description` (>800 chars): `{ name: "Dish", price: 100, description: "D".repeat(900), category: "สลัด", isAvailable: true, isPublished: true, orderIndex: 0 }` -> REJECT
6. Non-boolean `isAvailable`: `{ name: "Dish", price: 100, category: "สลัด", isAvailable: "yes", isPublished: true, orderIndex: 0 }` -> REJECT
7. Non-boolean `isPublished`: `{ name: "Dish", price: 100, category: "สลัด", isAvailable: true, isPublished: 1, orderIndex: 0 }` -> REJECT
8. Non-numeric `orderIndex`: `{ name: "Dish", price: 100, category: "สลัด", isAvailable: true, isPublished: true, orderIndex: "first" }` -> REJECT
9. Ghost fields injected (Unknown properties attack): `{ name: "Dish", price: 100, category: "สลัด", isAvailable: true, isPublished: true, orderIndex: 0, adminOverrideRole: true }` -> REJECT
10. Malicious document ID injection (Path traversal / junk payload > 128 chars) -> REJECT
11. Category item missing `name`: `{ orderIndex: 0 }` -> REJECT
12. Category item with non-numeric `orderIndex`: `{ name: "สเต็ก", orderIndex: "zero" }` -> REJECT

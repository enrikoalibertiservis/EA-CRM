-- Alfa Romeo models
INSERT INTO vehicle_models (brand_id, name, sort_order)
SELECT b.id, m.name, m.ord
FROM brands b
CROSS JOIN (VALUES
  ('Junior', 1), ('Tonale', 2), ('Giulia', 3), ('Stelvio', 4)
) AS m(name, ord)
WHERE b.slug = 'alfa-romeo'
ON CONFLICT DO NOTHING;

-- Jeep models
INSERT INTO vehicle_models (brand_id, name, sort_order)
SELECT b.id, m.name, m.ord
FROM brands b
CROSS JOIN (VALUES
  ('Avenger – Elektrik', 1),
  ('Avenger – e-Hybrid', 2),
  ('Avenger – 4xe Hybrid', 3),
  ('Compass – e-Hybrid', 4),
  ('Compass – 4xe Plug-in Hybrid', 5),
  ('Renegade – e-Hybrid', 6)
) AS m(name, ord)
WHERE b.slug = 'jeep'
ON CONFLICT DO NOTHING;

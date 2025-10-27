-- Seed initial products and variants (example data)
insert into products (name, slug, description, active, sort_order)
values
  ('Foxes T-Shirt', 'foxes-tshirt', 'Soft cotton tee with Foxes logo.', true, 1),
  ('Foxes Hoodie', 'foxes-hoodie', 'Fleece hoodie, cozy and warm.', true, 2),
  ('Foxes Cap', 'foxes-cap', 'Adjustable cap with embroidered logo.', true, 3)
on conflict (slug) do nothing;

-- Variants (sizes/colors/prices in cents)
insert into product_variants (product_id, size_value, color_value, price_cents, sku, active)
select p.id, v.size, v.color, v.price, v.sku, true
from (
  values
    ('foxes-tshirt','YS', 'Black', 2000, 'TSHIRT-YS-BLK'),
    ('foxes-tshirt','YM', 'Black', 2000, 'TSHIRT-YM-BLK'),
    ('foxes-tshirt','YL', 'Black', 2000, 'TSHIRT-YL-BLK'),
    ('foxes-tshirt','S',  'Black', 2200, 'TSHIRT-S-BLK'),
    ('foxes-tshirt','M',  'Black', 2200, 'TSHIRT-M-BLK'),
    ('foxes-tshirt','L',  'Black', 2200, 'TSHIRT-L-BLK'),
    ('foxes-hoodie','YS', 'Black', 4500, 'HOODIE-YS-BLK'),
    ('foxes-hoodie','YM', 'Black', 4500, 'HOODIE-YM-BLK'),
    ('foxes-hoodie','YL', 'Black', 4500, 'HOODIE-YL-BLK'),
    ('foxes-hoodie','S',  'Black', 4900, 'HOODIE-S-BLK'),
    ('foxes-hoodie','M',  'Black', 4900, 'HOODIE-M-BLK'),
    ('foxes-hoodie','L',  'Black', 4900, 'HOODIE-L-BLK'),
    ('foxes-cap',   null, 'Black', 2500, 'CAP-BLK')
) as v(slug,size,color,price,sku)
join products p on p.slug = v.slug
on conflict (sku) do nothing;



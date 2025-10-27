-- Printer Summary
select
  oi.product_name,
  coalesce(oi.size_value,'') as size,
  coalesce(oi.color_value,'') as color,
  sum(oi.quantity) as qty
from order_items oi
join orders o on o.id = oi.order_id
where o.status = 'paid'
group by 1,2,3
order by 1,2,3;

-- Sales Summary
select
  oi.product_name,
  sum(oi.line_total_cents) as revenue_cents,
  sum(oi.quantity) as qty
from order_items oi
join orders o on o.id = oi.order_id
where o.status = 'paid'
group by 1
order by revenue_cents desc;



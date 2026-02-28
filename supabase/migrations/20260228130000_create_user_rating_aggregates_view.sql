create or replace view public.user_rating_aggregates as
with base as (
  select
    target_user_id,
    sum(case when value = 1 then 1 else 0 end) as up_count,
    sum(case when value = -1 then 1 else 0 end) as down_count,
    count(*) as rating_count
  from public.user_ratings
  group by target_user_id
),
calc as (
  select
    target_user_id,
    up_count,
    down_count,
    rating_count,
    case
      when rating_count = 0 then 0.0
      else (1 + (up_count::numeric / rating_count::numeric) * 4)
    end as rating_avg_raw
  from base
)
select
  target_user_id,
  up_count,
  down_count,
  rating_count,
  round(rating_avg_raw::numeric, 1) as rating_avg_raw,
  round(
    (
      (3.8::numeric * 10::numeric) +
      (rating_avg_raw::numeric * rating_count::numeric)
    )
    /
    (10::numeric + rating_count::numeric)
  , 1) as rating_avg
from calc;

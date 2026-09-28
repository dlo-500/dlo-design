-- Optional read-only aggregate endpoint for the app home dashboard.
-- This function uses SECURITY INVOKER: it respects the caller's existing
-- table privileges and case_diary RLS policies. It does not return case rows
-- or change any table grants or policies.
-- Run this once in the Supabase SQL Editor, then reload the app.

CREATE OR REPLACE FUNCTION public.get_app_dashboard_stats()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $function$
  SELECT pg_catalog.jsonb_build_object(
    'total', pg_catalog.count(*)::integer,
    'active', pg_catalog.count(*) FILTER (
      WHERE NOT (
        pg_catalog.lower(COALESCE(case_status, '')) LIKE '%dispos%'
        OR pg_catalog.lower(COALESCE(case_status, '')) = 'closed'
      )
    )::integer,
    'disposed', pg_catalog.count(*) FILTER (
      WHERE pg_catalog.lower(COALESCE(case_status, '')) LIKE '%dispos%'
         OR pg_catalog.lower(COALESCE(case_status, '')) = 'closed'
    )::integer,
    'replyFiled', pg_catalog.count(*) FILTER (
      WHERE pg_catalog.lower(pg_catalog.btrim(COALESCE(reply_status, ''))) NOT LIKE 'not%'
        AND pg_catalog.lower(pg_catalog.btrim(COALESCE(reply_status, ''))) NOT LIKE '%pending%'
        AND pg_catalog.lower(pg_catalog.btrim(COALESCE(reply_status, ''))) NOT LIKE '%pend%'
        AND (
          pg_catalog.lower(pg_catalog.btrim(COALESCE(reply_status, ''))) IN ('filed', 'yes', 'done', 'reply filed')
          OR pg_catalog.lower(pg_catalog.btrim(COALESCE(reply_status, ''))) LIKE '%filed%'
        )
    )::integer,
    'replyPending', pg_catalog.count(*) FILTER (
      WHERE pg_catalog.lower(pg_catalog.btrim(COALESCE(reply_status, ''))) IN ('', 'not filed', 'no')
         OR pg_catalog.lower(pg_catalog.btrim(COALESCE(reply_status, ''))) LIKE 'not%'
         OR pg_catalog.lower(pg_catalog.btrim(COALESCE(reply_status, ''))) LIKE '%pending%'
         OR pg_catalog.lower(pg_catalog.btrim(COALESCE(reply_status, ''))) LIKE '%pend%'
    )::integer,
    'exparte', pg_catalog.count(*) FILTER (
      WHERE pg_catalog.lower(pg_catalog.btrim(COALESCE(exparte_status, ''))) NOT LIKE '%not%'
        AND (
          pg_catalog.lower(pg_catalog.btrim(COALESCE(exparte_status, ''))) LIKE '%ex-parte%'
          OR pg_catalog.lower(pg_catalog.btrim(COALESCE(exparte_status, ''))) LIKE '%exparte%'
          OR pg_catalog.lower(pg_catalog.btrim(COALESCE(exparte_status, ''))) LIKE '%ex parte%'
          OR pg_catalog.lower(pg_catalog.btrim(COALESCE(exparte_status, ''))) IN ('yes', 'true', '1')
        )
    )::integer,
    'courtsCovered', pg_catalog.count(DISTINCT COALESCE(
      NULLIF(pg_catalog.btrim(court_name), ''), 'Unknown'
    ))::integer
  )
  FROM public.case_diary;
$function$;

REVOKE ALL ON FUNCTION public.get_app_dashboard_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_app_dashboard_stats() TO anon, authenticated;

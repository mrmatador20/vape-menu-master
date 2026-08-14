REVOKE EXECUTE ON FUNCTION public.balcao_unit_price(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.balcao_unit_price(uuid, uuid) TO authenticated, service_role;
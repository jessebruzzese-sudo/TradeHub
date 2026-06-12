// vim: ts=2
"use server";
import { cookies }  from "next/headers";
import * as jose from "jose";
export const getClaims = async () => {
	const store = await cookies();
  const cookie = store.get("authorization") ?? null;
  const jwt = cookie?.value ?? null;
  return jose.decodeJwt(jwt);
};

// vim: ts=2
import * as jose from "jose";
const alg = "HS256";
//const secret = await jose.generateSecret(alg);
//console.log(secret);
const secret = new TextEncoder().encode(process.argv[2]);
const payload = { user: "tim.alford@ockasoftware.com.au", role: "admin" };
const jwt = await new jose.SignJWT(payload).
	setProtectedHeader({alg}).
	setIssuedAt().
	setExpirationTime("2h").
	sign(secret);
console.log(jwt);
const { tokenPayload, protectedHeader } = await jose.jwtVerify(jwt, secret);
console.log(tokenPayload);
console.log(protectedHeader);
const result = await jose.decodeJwt(jwt);
console.log(result);

// vim: ts=2
import * as jose from "jose";
export const isUserAdmin = (user:any) => {
	return user?.role?.toLowerCase() === "admin";
};
export const isAdmin = async (jwt:string): Promise<boolean> => {
	return new Promise(async(resolve, reject)=>{
		if(jwt === null || jwt === undefined){
			resolve(false);
			return;
		}	
		const claims = await jose.decodeJwt(jwt);
		const check = claims.role?.toLowerCase() === "admin";
		resolve(check);
	});
}

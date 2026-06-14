import * as bcrypt from "bcrypt";
import * as crypto from "crypto";
const plain = process.argv[2];
const mode = process.argv[3];
const SALT_ROUNDS = 10;
if(mode === "generate"){
	bcrypt.hash(plain, SALT_ROUNDS, (err, hash)=>{
		console.log(hash);
	});
}else{
	const hashed = process.argv[4];
	bcrypt.compare(plain, hashed, (err, result)=>{
		console.log(result);
	});
}

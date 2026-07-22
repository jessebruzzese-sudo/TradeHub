import UserContext from "@/lib/user-context";
import { getAxios } from "@/lib/utils";
import { useContext, useEffect, useState } from "react";
const UserProvider = (props) => {
	const UserSession = useContext(UserContext);
	const [currentUser, setCurrentUser] = useState<any|null>(UserSession?.user ?? null);
	useEffect(()=>{
		if(currentUser !== null){
			return;
		}	
		console.log("UserProvider :: Loading user");
		getAxios(null).get("/api/me").
			then((response)=>{
				const data = response.data;
				UserSession.user = data;
				console.log("UserProvider :: User loaded");
				props.onUserLoaded(UserSession.user);
				setCurrentUser(data);
			});
	},[currentUser]);
	return (
		<div id={"UserProvider"}>{props.children}</div>
	);
};
export default UserProvider;

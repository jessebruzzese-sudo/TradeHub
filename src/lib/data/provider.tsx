'use client'
// vim: ts=2
import { useContext, createContext, useMemo } from "react";
import * as usersRepo from "@/lib/data/repos/users";
const DataServiceContext = createContext<any|null>(null);
export const DataServiceProvider = (props) => {
	const ctx = useMemo(
		()=>{
			return { 
				users: usersRepo 
			}
		},
		[]
	);
	return (
		<DataServiceContext.Provider value={ctx}>{props.children}</DataServiceContext.Provider>
	);
};
export const useDataService = () => {
	const context = useContext(DataServiceContext);	
	if(!context){
		throw new Error("Must be within DataServiceContextProvider");
	}
	return context;
};

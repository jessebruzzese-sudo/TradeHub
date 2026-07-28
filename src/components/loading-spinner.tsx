import { Grid, CircularProgress } from "@mui/material";
import UserProvider from "@/components/hoc/UserProvider";
export const LoadingSpinner = (props:any) => {
	return (
		<Grid container sx={{alignItems:"center", height:"100%"}}>
			<Grid item size={12}>
				<Grid container sx={{justifyContent:"center"}}> 
					<Grid item>
						<UserProvider onUserLoaded={props.onUserLoaded}>
							<CircularProgress aria-label="Loading..."/>
						</UserProvider> 
					</Grid>
				</Grid>
			</Grid>
		</Grid>
	);
};

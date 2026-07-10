"use client";
// vim:ts=2
import { createTheme } from "@mui/material/styles";
const TradeHubTheme = createTheme({
	components: {
		MuiTypography: {
			style:{
				fontFamily: "Inter"
			}
		},
		MuiInputBase: {
			style:{
				fontFamily: "Inter"
			}
		},
		MuiButton: {
			style: {
				textTransform: "none",
				fontFamily: "Inter"
			}
		}
	}
});
export default TradeHubTheme;

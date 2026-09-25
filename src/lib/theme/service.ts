"use client";
// vim:ts=2
import { createTheme } from "@mui/material/styles";
const TradeHubTheme = createTheme({
	palette: {
		secondary: {
			main: "#f8f9fb",
			light: "#f8f9fb",
			dark: "#f8f9fb",
			contrastText: "#142035"
		},
		primary: {
			main: "#000767"
		}
	},
	typography: {
		body2: {
			fontSize: "14px",
			color: "#647187"
		},
		link: {
			color: "#006cc4",
			fontSize:"13px",
			textDecoration: "none",
			fontWeight: "550"
		},
		label:{
			fontSize:"13px",
			fontWeight:"550",
			width: "100%",
			display:"block",
			textAlign:"left",
			marginBottom: "9px",
			color: "#142035"
		},
		h1: {
			fontSize:"44px",
			color:"white",
			lineHeight:"1.13",
			fontWeight:"650",
			letterSpacing:"-1.9px"
		},
		intro: {	
			fontSize:"15px",
			color:"#c0ccdc",
			lineHeight:"1.75"
		},
		h2: {
			color: "#142035",
			fontSize:"29px",
			lineHeight:"1.2",
			letterSpacing:"-0.9px",
			fontWeight:"650"
		}
	},
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

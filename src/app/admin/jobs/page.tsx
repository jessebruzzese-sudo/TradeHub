// vim:ts=2
'use client';
import { getAxios } from "@/lib/utils";
import { useEffect, useState, useContext } from 'react';
import { Grid, useTheme, TextField, Dialog, DialogContent, DialogTitle, Typography, Select, FormControl, InputLabel, MenuItem, Switch, FormControlLabel, Tooltip, Button } from "@mui/material";
import UserContext from "@/lib/user-context";
import UserProvider from "@/components/hoc/UserProvider";
import Link from 'next/link';
import { redirect } from "next/navigation";
import { format } from 'date-fns';
import { AppLayout } from '@/components/app-nav';
import StatusPill from '@/components/status-pill';
import { UnauthorizedAccess } from '@/components/unauthorized-access';
import type { JobStatus } from '@/lib/types';
import { toast } from "sonner";
import { LoadingSpinner } from "@/components/loading-spinner";

type JobRow = {
  id: string;
  title: string | null;
  status: string;
  created_at: string | null;
  contractor_id: string;
  trade_category: string;
  contractor_name?: string | null;
};

const DEFAULT_PAGE = 0;
const DEFAULT_PAGE_SIZE = 10;

export default function AdminJobsPage() {

	const UserSession = useContext(UserContext);
	const theme = useTheme();
	const [currentUser, setCurrentUser] = useState<any|null>(UserSession?.user ?? null);
  const [jobs, setJobs] = useState<JobRow[]|null>(null);
	const [searchTerm, setSearchTerm] = useState<string|null>(null);
	const [sortBy, setSortBy] = useState<string|null>("newest");
	const [page, setPage] = useState<integer>(DEFAULT_PAGE);
	const [pageSize, setPageSize] = useState<integer>(DEFAULT_PAGE_SIZE);
	const [inWindow, setInWindow] = useState<boolean>(true);
	const [deletingJob, setDeletingJob] = useState<string|null>(null);

	const isLoading = jobs === null || currentUser === null;
	const isDeleting = deletingJob !== null;
	const isAdmin = currentUser?.role?.toLowerCase() === "admin";

  useEffect(() => {
		if(jobs !== null){
			return;
		}
		if(currentUser === null){
			return;
		}
		if(!isAdmin){
			return;
		}
		toast.info("Loading jobs");
		const params = new URLSearchParams({
			sortBy,
			searchTerm,
			inWindow,
			page,
			pageSize
		});
		getAxios(null).get(`/api/admin/jobs?${params.toString()}`).
			then((response)=>{
				const data = response.data;
				setJobs(data.jobs);
			}).catch((error)=>{
				const msg = error?.response?.data?.msg ?? null;
				if(msg){
					toast.error(msg);
				}
			});
  }, [currentUser, jobs, searchTerm, inWindow, page, pageSize]);
	
	const handleDeleteJob = (jobId:string) => {
		setDeletingJob(jobId);
	};
			
	const getJobTitle = (jobId:string) => {
		const job = jobs.find((x)=>x.id === jobId);
		return job?.title;
	};
	
	const confirmJobDelete = () => {
		getAxios(null).delete(`/api/admin/jobs/${deletingJob}`).
			then((response_)=>{
				toast.success("Job deleted");
				setDeletingJob(null);
				setJobs(null);
			}).catch((error_)=>{
				const msg = error_?.repsonse?.data?.msg ?? null;
				if(msg){
					toast.error(msg);
				}
			});
	};
		
	if(isLoading){
    return (
      <LoadingSpinner onUserLoaded={(user)=>{setCurrentUser(user);}}/>
    );   
  }

	if(!isAdmin){
		redirect("/");
		return null;
	}
	
	const sortOptions = [
		{ value: "newest", label: "Newest" },
		{ value: "oldest", label: "Oldest" }
	];
		
  return (
		<Grid container spacing={2} sx={{padding:theme.spacing(3)}}>
		<Grid item size={12}>	
			<UserProvider onUserLoaded={(user)=>{setCurrentUser(user);}}>
				<h1 className="text-2xl font-bold text-gray-900">All Jobs (Read-Only)</h1>
			</UserProvider>
		</Grid>
		<Grid item size={12}>	
			<Grid container spacing={2} sx={{justifyContent:"flex-start", alignItems:"center"}}>	
				<Grid item size={9}>
					<TextField value={searchTerm} 
						onChange={(event)=>{setSearchTerm(event.target.value);}} 
						onBlur={(event)=>{setJobs(null);}}
						label={"Search"}
						placeholder={"Search by title, contractor ..."}
						size={"small"}
						fullWidth
						variant={"outlined"}
					/>
				</Grid>
				<Grid item size={2}>
					<FormControl fullWidth>
						<InputLabel id={"labelSortBy"}>Sort</InputLabel>
						<Select 
							id={"selectedTrade"}
							labelId={"labelSortBy"}
							value={sortBy}
							onChange={(event)=>{setSortBy(event.target.value);setJobs(null);}}
							size={"small"}
							label={"Sort"}
							fullWidth
							variant={"outlined"}
							MenuProps={{disableScrollLock: true}}
						>
							{sortOptions.map((e,i)=>{
								return <MenuItem value={e.value} key={`sort_by_${i}`}>{e.label}</MenuItem>
							})} 
						</Select>
					</FormControl>
				</Grid>
				<Grid item size={1}>
					<FormControlLabel 
						label={"In Window"} 
						labelPlacement={"bottom"} 
						control={
							<Tooltip title={"View jobs within listing window (30 days)"}>
								<Switch checked={inWindow} onChange={()=>{setInWindow(!inWindow);setJobs(null);}}/>
							</Tooltip>
						}/>
				</Grid>
			</Grid>
		</Grid>
		<Grid item size={12}>
        {jobs.length === 0 && (
          <p className="text-gray-600">No jobs found.</p>
        )}
        {jobs.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Job Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Contractor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Posted
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{job.title || '—'}</div>
                      <div className="text-sm text-gray-600">{job.tradeCategory}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {job.owner.name || 'Unknown'}
                    </td>
                    <td className="px-6 py-4">
                      <StatusPill type="job" status={job.status as JobStatus} />
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {job.createdAt
                        ? format(new Date(job.createdAt), 'MMM dd, yyyy')
                        : '—'}
                    </td>
                    <td className="px-6 py-4">
											<Grid container sx={{justifyContent:"center", alignItems:"center"}} spacing={2}>
											<Grid item>
                      <Link
                        href={`/admin/jobs/${job.id}`}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                      >
                        View
                      </Link>
											</Grid>
											<Grid item>
												<Button size={"small"} 
													onClick={()=>{handleDeleteJob(job.id);}} 
													variant={"contained"} 
													color={"error"}>
														Delete
												</Button>
											</Grid>
											</Grid>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </Grid>
		<Grid item size={12}>
			{/*PAGINATION HERE*/}
			{/*DIALOGS*/}
			<Dialog open={isDeleting} onClose={()=>{setDeletingJob(null);}} maxWidth={"sm"} fullWidth>
				<DialogTitle>
					<Typography sx={{textAlign:"center"}} variant={"h5"}>
						Confirm Delete Job
					</Typography>
				</DialogTitle>
				<DialogContent>
					<Grid container spacing={2}>
						<Grid item size={12}>
							<Typography sx={{textAlign:"center"}} variant={"body1"}>
								Are you sure you want to delete the job <b><i>{getJobTitle(deletingJob)}</i></b>?
							</Typography>
						</Grid>
						<Grid item size={12}>
							<Grid container sx={{justifyContent: "center", alignItems: "center"}} spacing={2}>
								<Grid item>
									<Button color={"error"} variant={"contained"} onClick={confirmJobDelete}>Yes</Button>
								</Grid>
								<Grid item>
									<Button color={"primary"} variant={"contained"} onClick={()=>{setDeletingJob(null);}}>No</Button>
								</Grid>
							</Grid>
						</Grid>
					</Grid>
				</DialogContent>
			</Dialog>
		</Grid>
    </Grid>
  );
}

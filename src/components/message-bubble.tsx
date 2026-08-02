// vim: ts=2
import { Message } from '@/lib/types';
import { format } from 'date-fns';
import { Info } from 'lucide-react';
import { ExpandMore, ExpandLess, Close } from "@mui/icons-material";
import { IconButton, Grid, Badge, Tooltip } from "@mui/material";

interface MessageBubbleProps {
  message: Message;
  isMe: boolean;
	onDeleteClicked: () => void;
}

export function MessageBubble({ message, isMe, onDeleteClicked }: MessageBubbleProps) {
  if (message.isSystem) {
    return (
      <div className="flex justify-center my-4">
        <div className="bg-gray-100 border border-gray-200 rounded-lg px-4 py-2 max-w-md">
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <Info className="w-4 h-4 text-gray-500" />
            <span>{message.message}</span>
          </div>
          <p className="text-xs text-gray-500 text-center mt-1">
            {format(message.createdAt, 'MMM dd, h:mm a')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-md rounded-2xl px-4 py-2 ${
          isMe ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'
        }`}
      >
				<Grid container>
				<Grid item size={12}>
					<Grid container sx={{justifyContent:"flex-start", alignItems:"baseline"}}>
						<Grid item size={isMe ? 10 : 12}>
        			<p className="text-sm whitespace-pre-wrap break-words">{message.message}</p>
						</Grid>
						{isMe && ( 
						<Grid item size={2}>
							<Grid container sx={{justifyContent:"flex-end", alignItems:"baseline"}}>
								<Grid item>
									<Tooltip title={"Delete message"}>
										<IconButton size={"xs"} onClick={onDeleteClicked}>
											<Close sx={{color:"white", width:"15px", height:"auto"}}/>
										</IconButton>
									</Tooltip>
								</Grid>
							</Grid>
						</Grid>
						)}
					</Grid>
				</Grid>
				<Grid item size={12}>
					<Grid container>
						<Grid item>
        		<p className={`text-xs ${isMe ? 'text-blue-100' : 'text-gray-500'}`}>
          		{format(message.createdAt, 'h:mm a')}
        		</p>
						</Grid>
					</Grid>
				</Grid>
				</Grid>
      </div>
    </div>
  );
}

import CircularProgress from "@mui/material/CircularProgress";
const Loading = ({
  size = 24,
  showText = true,
}: {
  size?: number;
  showText?: boolean;
}) => {
  return (
    <div className="flex items-center justify-center">
      <div className="flex items-center gap-4 text-blue-800">
        <CircularProgress color="inherit" size={size} />
        {showText && <p className="text-blue-800 animate-pulse">Loading...</p>}
      </div>
    </div>
  );
};

export default Loading;

import CircularProgress from "@mui/material/CircularProgress";
const Loading = () => {
  return (
    <div className="flex items-center justify-center">
      <div className="flex items-center gap-4 text-blue-800">
        <CircularProgress color="inherit" size={24} />
        <p className="text-blue-800 animate-pulse">Loading...</p>
      </div>
    </div>
  );
};

export default Loading;

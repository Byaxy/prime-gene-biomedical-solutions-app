"use client";

import {
  Box,
  CssBaseline,
  Divider,
  IconButton,
  Toolbar,
  useMediaQuery,
} from "@mui/material";
import { CSSObject, Theme, styled } from "@mui/material/styles";
import MenuIcon from "@mui/icons-material/Menu";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import MuiAppBar, { AppBarProps as MuiAppBarProps } from "@mui/material/AppBar";
import MuiDrawer from "@mui/material/Drawer";
import { useEffect, useState } from "react";
import Header from "@/components/Header";
import Link from "next/link";
import SidebarMenu from "@/components/sidebar/SidebarMenu";
import { sidebarData } from "@/constants";
import { theme } from "@/lib/theme";

const drawerWidth = 270;

const openedMixin = (theme: Theme): CSSObject => ({
  width: drawerWidth,
  transition: theme.transitions.create("width", {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.enteringScreen,
  }),
  overflowX: "hidden",
});

const closedMixin = (theme: Theme): CSSObject => ({
  transition: theme.transitions.create("width", {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  overflowX: "hidden",
  width: `calc(${theme.spacing(6)} + 1px)`,
});

const DrawerHeader = styled("div")(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: theme.spacing(0, 1),
  // necessary for content to be below app bar
  ...theme.mixins.toolbar,
}));

interface AppBarProps extends MuiAppBarProps {
  open?: boolean;
}

const AppBar = styled(MuiAppBar, {
  shouldForwardProp: (prop) => prop !== "open",
})<AppBarProps>(({ theme, open }) => ({
  zIndex: theme.zIndex.drawer + 1,
  transition: theme.transitions.create(["width", "margin"], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  ...(open && {
    marginLeft: drawerWidth,
    width: `calc(100% - ${drawerWidth}px)`,
    transition: theme.transitions.create(["width", "margin"], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
  }),
}));

const Drawer = styled(MuiDrawer, {
  shouldForwardProp: (prop) => prop !== "open",
})(({ theme, open }) => ({
  width: drawerWidth,
  flexShrink: 0,
  whiteSpace: "nowrap",
  boxSizing: "border-box",
  ...(open && {
    ...openedMixin(theme),
    "& .MuiDrawer-paper": openedMixin(theme),
  }),
  ...(!open && {
    ...closedMixin(theme),
    "& .MuiDrawer-paper": closedMixin(theme),
  }),
}));

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const matchesMidium = useMediaQuery(theme.breakpoints.down("md"));

  const handleDrawerOpen = () => {
    setOpen(true);
  };

  const handleDrawerClose = () => {
    setOpen(false);
  };

  useEffect(() => {
    if (matchesMidium) {
      handleDrawerClose();
    } else {
      handleDrawerOpen();
    }
  }, [matchesMidium]);

  return (
    <section>
      <Box className="flex bg-light-200 text-blue-800">
        <CssBaseline />
        <AppBar
          className="fixed shadow-md !z-40"
          open={open}
          sx={{
            backgroundColor: "#002060",
            color: "white",
          }}
        >
          <Toolbar>
            <IconButton
              className="shadow-md"
              aria-label="open drawer"
              onClick={handleDrawerOpen}
              edge="start"
              sx={{
                marginRight: 5,
                color: "#002060",
                backgroundColor: "white",
                ...(open && { display: "none" }),
                "&:hover": {
                  backgroundColor: "white",
                  color: "#00fdff",
                },
              }}
            >
              <MenuIcon titleAccess="Open Side Menu" />
            </IconButton>

            {/** Header */}
            <Header />
          </Toolbar>
        </AppBar>
        {/** Sidebar Navigation */}
        <Drawer
          variant="permanent"
          open={open}
          className="bg-white scrollbar-hide !z-30"
        >
          {/** Drawer Header */}
          <DrawerHeader className="w-full flex flex-row justify-between items-center">
            {/** logo */}
            <Link
              href={"/"}
              className="no-underline flex items-center justify-center bg-primaryColor/95 p-1"
            >
              <h1 className="text-xl bg-gradient-to-r from-blue-800 bg-clip-text text-transparent font-bold to-[#587390]">
                Homeland Interiors
              </h1>
            </Link>
            <IconButton
              onClick={handleDrawerClose}
              className="shadow-md bg-primaryColor"
              sx={{
                color: "white",
                backgroundColor: "#002060",
                "&:hover": {
                  color: "#00fdff",
                  backgroundColor: "#002060",
                },
              }}
            >
              {theme.direction === "rtl" ? (
                <ChevronRightIcon titleAccess="Open Side Menu" />
              ) : (
                <ChevronLeftIcon titleAccess="Close Side Menu" />
              )}
            </IconButton>
          </DrawerHeader>

          <Divider />

          {/** Side bar */}
          <SidebarMenu data={sidebarData} open={open} />
        </Drawer>

        {/** Main Content */}
        <Box className="min-h-screen w-full bg-light-200 p-8" component="main">
          <DrawerHeader />
          {children}
        </Box>
      </Box>
    </section>
  );
}

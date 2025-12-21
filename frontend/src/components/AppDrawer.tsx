// import {
//   Box,
//   CircularProgress,
//   Drawer,
//   List,
//   ListItem,
//   ListItemButton,
//   ListItemText,
//   ListSubheader,
//   Toolbar,
// } from "@mui/material"
// //import { useOrchards } from "../hooks/useOrchards"

// const drawerWidth = 240

// function AppDrawer() {
//   // Fetch orchards
//   const { data: orchards, isLoading, error } = useOrchards()

//   // Fetch stations for all orchards eagerly

//   if (isLoading) return <CircularProgress sx={{ m: 2 }} />
//   if (error) return <div>Error loading orchards</div>

//   return (
//     <Drawer
//       variant="permanent"
//       sx={{
//         width: drawerWidth,
//         flexShrink: 0,
//         [`& .MuiDrawer-paper`]: {
//           width: drawerWidth,
//           boxSizing: "border-box",
//         },
//       }}
//     >
//       <Toolbar />
//       <List
//         subheader={
//           <ListSubheader component="div" id="nested-list-subheader">
//             Orchards & Stations
//           </ListSubheader>
//         }
//       >
//         {orchards?.map((orchard, i) => {
//           return (
//             <Box key={orchard.id}>
//               <ListItem disablePadding>
//                 <ListItemButton>
//                   <ListItemText primary={orchard.name} />
//                 </ListItemButton>
//               </ListItem>
//             </Box>
//           )
//         })}
//       </List>
//     </Drawer>
//   )
// }

// export default AppDrawer

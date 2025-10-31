// Shared room images configuration - used by both AdminRooms and ReserveRoom
import DiscussionRoom1 from "../assets/1st_Floor/Discussion/Discussion_Room_1.jpg";
import DiscussionRoom2 from "../assets/1st_Floor/Discussion/Discussion_Room_2.jpg";
import DiscussionRoom3 from "../assets/1st_Floor/Discussion/Discussion_Room_3.jpg";
import GraduateHub1 from "../assets/1st_Floor/Graduate/Graduate_Research_Hub_1.jpg";
import GraduateHub2 from "../assets/1st_Floor/Graduate/Graduate_Research_Hub_2.jpg";
import GraduateHub3 from "../assets/1st_Floor/Graduate/Graduate_Research_Hub_3.jpg";
import GroundFloorImg from "../assets/GroundFloor.jpg";
import FifthFloorImg from "../assets/picture2.jpg";
import FacultyRoomImg from "../assets/FacultyRoom.jpg";
import CollabRoomImg from "../assets/CollabRoom.jpg";

// 2nd Floor imports
import SecondFloor1 from "../assets/2nd_Floor/2nd_Floor.2.jpg";
import SecondFloor2 from "../assets/2nd_Floor/2nd_Floor.jpg";
import DiscussionRoom1_1 from "../assets/2nd_Floor/Discussion/Discussion_Room_1.1.jpg";
import DiscussionRoom1_2 from "../assets/2nd_Floor/Discussion/Discussion_Room_1.jpg";
import DiscussionRoom2_1 from "../assets/2nd_Floor/Discussion/Discussion_Room_2.1.jpg";
import DiscussionRoom2_2 from "../assets/2nd_Floor/Discussion/Discussion_Room_2.jpg";
import FacultyRoom1_1 from "../assets/2nd_Floor/Faculty/Faculty_Room_1.1.jpg";
import FacultyRoom1_2 from "../assets/2nd_Floor/Faculty/Faculty_Room_1.jpg";

export const availableRoomImages = [
  // 1st Floor Discussion Rooms
  { id: "discussion_room_1", name: "Discussion Room 1", url: DiscussionRoom1, category: "Discussion" },
  { id: "discussion_room_2", name: "Discussion Room 2", url: DiscussionRoom2, category: "Discussion" },
  { id: "discussion_room_3", name: "Discussion Room 3", url: DiscussionRoom3, category: "Discussion" },
  
  // 1st Floor Graduate Research Hubs
  { id: "graduate_hub_1", name: "Graduate Research Hub 1", url: GraduateHub1, category: "Graduate" },
  { id: "graduate_hub_2", name: "Graduate Research Hub 2", url: GraduateHub2, category: "Graduate" },
  { id: "graduate_hub_3", name: "Graduate Research Hub 3", url: GraduateHub3, category: "Graduate" },
  
  // 2nd Floor Discussion Rooms
  { id: "2nd_discussion_room_1_2", name: "2nd Floor Discussion Room 1", url: DiscussionRoom1_2ndFloor, category: "Discussion" },
  { id: "2nd_discussion_room_1_1", name: "2nd Floor Discussion Room 1.1", url: DiscussionRoom1_1_2ndFloor, category: "Discussion" },
  { id: "2nd_discussion_room_2_2", name: "2nd Floor Discussion Room 2", url: DiscussionRoom2_2ndFloor, category: "Discussion" },
  { id: "2nd_discussion_room_2_1", name: "2nd Floor Discussion Room 2.1", url: DiscussionRoom2_1_2ndFloor, category: "Discussion" },
  
  // 2nd Floor Faculty Rooms
  { id: "2nd_faculty_room_1_1", name: "2nd Floor Faculty Room 1.1", url: FacultyRoom1_1_2ndFloor, category: "Faculty" },
  { id: "2nd_faculty_room_1_2", name: "2nd Floor Faculty Room 1", url: FacultyRoom1_2_2ndFloor, category: "Faculty" },
  
  // Floor Images
  { id: "ground_floor", name: "Ground Floor", url: GroundFloorImg, category: "Floor" },
  { id: "second_floor_1", name: "Second Floor View 1", url: SecondFloor1, category: "Floor" },
  { id: "second_floor_2", name: "Second Floor View 2", url: SecondFloor2, category: "Floor" },
  { id: "fifth_floor", name: "Fifth Floor", url: FifthFloorImg, category: "Floor" },
  { id: "faculty_room", name: "Faculty Room", url: FacultyRoomImg, category: "Special" },
  { id: "collab_room", name: "Collaboration Room", url: CollabRoomImg, category: "Special" },
];

// Helper function to get image by ID
export const getRoomImageById = (imageId) => {
  return availableRoomImages.find(img => img.id === imageId);
};

// Helper function to get image by URL (for backward compatibility)
export const getRoomImageByUrl = (imageUrl) => {
  return availableRoomImages.find(img => img.url === imageUrl);
};
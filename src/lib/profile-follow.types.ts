export type FollowedProfile = {
  follow_id: string;
  profile_id: string;
  display_name: string;
  username: string | null;
  apelido: string | null;
  avatar_url: string | null;
  category: string | null;
  last_updated_at: string;
  followed_at: string;
  mutual_connections_count?: number | null;
};

export type ProfileUpdateFeedItem = {
  id: string;
  profile_id: string;
  title: string;
  description: string | null;
  type: string;
  created_at: string;
  profile_name: string;
  profile_avatar_url: string | null;
  profile_username: string | null;
  profile_apelido: string | null;
};

export type SearchProfileResult = {
  id: string;
  display_name: string;
  username: string | null;
  apelido: string | null;
  email: string | null;
  whatsapp: string | null;
  avatar_url: string | null;
  city: string | null;
  level: string | null;
  posicao_principal: string | null;
};

export type ProfileFollowStatus = {
  following: boolean;
};

export type PublicProfileUpdate = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  created_at: string;
};

export type PublicProfileGalleryPhoto = {
  id: string;
  image_url: string;
  description: string | null;
  created_at: string;
};

export type PublicProfileConnection = {
  profile_id: string;
  display_name: string;
  username: string | null;
  apelido: string | null;
  avatar_url: string | null;
  category: string | null;
};

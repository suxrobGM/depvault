import type { ReactElement } from "react";
import { Avatar, type AvatarProps } from "@mui/material";

interface UserAvatarProps {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  size?: number;
  sx?: AvatarProps["sx"];
}

/** Reusable avatar with initials fallback derived from name or email. */
export function UserAvatar(props: UserAvatarProps): ReactElement {
  const { firstName, lastName, email, avatarUrl, size = 32, sx } = props;

  const initials =
    firstName && lastName
      ? `${firstName[0]}${lastName[0]}`.toUpperCase()
      : (email?.slice(0, 2).toUpperCase() ?? "?");

  return (
    <Avatar
      src={avatarUrl ?? undefined}
      sx={[
        {
          width: size,
          height: size,
          fontSize: size * 0.4,
          bgcolor: "primary.main",
          color: "primary.contrastText",
        },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
    >
      {initials}
    </Avatar>
  );
}

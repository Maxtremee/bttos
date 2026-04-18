import { useNavigate } from "@solidjs/router";
import { createEffect, type ParentProps } from "solid-js";
import { authStore } from "../stores/authStore";

export default function AuthGuard(props: ParentProps) {
  const navigate = useNavigate();

  createEffect(() => {
    // Read authStore.token reactively — do NOT destructure
    if (!authStore.token) {
      navigate("/login", { replace: true });
    }
  });

  return <>{props.children}</>;
}

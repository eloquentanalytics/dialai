import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

export function NewSession() {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (!name) return;

    fetch(`/api/machines/${name}/sessions`, { method: "POST" })
      .then((r) => r.json())
      .then((data) => {
        if (data.url) {
          navigate(data.url, { replace: true });
        }
      })
      .catch((e) => {
        console.error("Failed to create session:", e);
      });
  }, [name, navigate]);

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "2rem" }}>
      <p>Creating session for {name}...</p>
    </div>
  );
}

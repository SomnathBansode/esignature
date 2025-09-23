import React, { useState, useMemo, useCallback } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { useDispatch, useSelector } from "react-redux";
import { v4 as uuidv4 } from "uuid";
import toast from "react-hot-toast";
import {
  addTemplate,
  clearTemplateError,
} from "../../redux/slices/templateSlice";

// React-icons for a friendly, non-IT palette UI
import {
  FiUser,
  FiMail,
  FiPhone,
  FiGlobe,
  FiImage,
  FiBriefcase,
  FiMapPin,
  FiMinus,
  FiShare2,
  FiGithub,
  FiLinkedin,
  FiTwitter,
  FiFacebook,
  FiInstagram,
  FiType,
  FiLink,
  FiTrash2,
} from "react-icons/fi";

// --- Base64 inline SVGs for email-safe social icons (works in email clients) ---
const SOCIAL_ASSETS = {
  linkedin:
    "data:image/svg+xml;base64,PHN2ZyByb2xlPSJpbWciIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgdmlld0JveD0iMCAwIDI0IDI0Ij48cGF0aCBmaWxsPSIjMDE4YjllIiBkPSJNMy41IDE4Ljc1aDMuMzc1VjkuMzg4SDMuNVYxOC43NXpNMy41IDguMTI1aC4wMTJDMi4yNSA4LjEyNSAyIDIuMDYyIDIgNi4xMjVjMC0yLjA5NyAxLjExNi0zLjY4NyAzLjM3NS0zLjY4N0MzLjM3NSAyLjQzOCAzLjM3NSAyLjQzOCAzLjM3NSAyLjQzOHMuMDEyIDAgLjAxMiAwYzEuMDk3IDAgMi4xMjUgMS4wMzEgMi4xMjUgMi4zMTNDNS41IDguMTI1IDMuNSA4LjEyNSAzLjUgOC4xMjV6TTE5LjUgMTguNzVoMy4zNzV2LTUuODEyYzAtMy4wNDQtMS42NTctNC41OTQtNC4xMjUtNC41OTRTMTQuODEzIDguODEzIDE0LjUgOS4yNSAxNC41IDEwLjUgMTQuNSAxMC41aC4wMTJ2MS4zNzVoLS4wMTJjMS4yNSAwIDIuNS0xLjEyNSAyLjUtMi41czEuMjUtMi41IDIuNS0yLjVDMjMuMzc1IDcuNSAyNC41IDEwLjUgMjQuNSAxMi43NXY1Ljk4N0gyMS4xMjV2LTUuMzg4YzAtMS44NzUtLjM3NS0zLjEyNS0yLjEyNS0zLjEyNXMtMi4xMjUgMS41NjItMi4xMjUgMy4xMjV2NS4zODhIMTMuNVY5LjM4OGgzLjc1VjEwLjVsLjAxMi0uMDEyYy41NjMtMS4xODggMS44NzUtMi4wNjIgMy43NS0yLjA2MiA0LjA2MiAwIDQuMDYyIDMuMTI1IDQuMDYyIDUuNzg4djYuMDQ0eiIvPjwvc3ZnPg==",
  twitter:
    "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MTIgNTEyIj48cGF0aCBmaWxsPSIjMWQ5YmY4IiBkPSJNMDEyLjUgNDM5LjZjMTkuMyAwIDM4LjQtMS44IDU3LTUuM2MtNjYuOC0yMC4yLTEyNC43LTY0LjEtMTU0LjMtMTE4LjIgOS41IDMuNiAxOS4xIDUuNCAyOS4yIDYuM2MtNTYuOC0zOC43LTk4LjktMTAyLjQtMTE0LjMtMTc0LjcgMjkuOCAxOC41IDYzLjUgMjkuNCA5OS41IDM0LjFjLTQ2LjEtMzMuNi05MC42LTg2LjItMTA4LjUtMTQ5LjMgMTYuNiAyOS4xIDM5LjkgNTMuNSA2Ny41IDcyLjJjLTQyLjItOC43LTgxLjMtMzIuOC0xMDkuMi02NC44Yy0xMC4yIDM0LjMtMy43IDcyLjYgMTcuOCA5NS40Yy01LjMtMS40LTEwLjQtMi43LTE1LjUtNC4ydi4zYzAgNDguOSAzNC42IDg5LjYgODAuNSA5OS41Yy0xMi43IDMuNC0yNi4xIDUuMy0zOS45IDUuMy0xMC4xIDAtMTkuOS0xLjItMjkuNS0zLjZjMTkuOSA2Mi43IDc3LjIgMTA4LjEgMTM5LjEgMTA5LjhjLTU5LjcgNDYuOS0xMzQuNSAxNzQuMy0yMTkuNSAxNzQuM0gzMkwzMiAyMGMxMTIuMiAwIDIwMy44LTU0LjUgMjU3LjUtMTM1LjFjMjMuNSAwIDQ2LjMgMy4zIDY4LjMgOS44YzQ2LjktMTcuMiA4OC44LTQ0LjkgMTIwLjctODEuOGMtMTEuMiA0OS43LTM1LjMgOTMuOC03NS43IDEyMC40YzM0LjktOS44IDY3LjItMjcuNSA5MS41LTUzLjNaIi8+PC9zdmc+",
  facebook:
    "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MTIgNTEyIj48cGF0aCBmaWxsPSIjMTg3N2YxIiBkPSJNMzI0IDY2LjhjLTcuMyAwLTEzLjIgMi4zLTE3LjcgNi41di00NS41SDI1MHYtMzMuMWMwLTQ0LjkgMzIuNS04MS41IDc2LjQtODEuNWg1OS4yVjk2aC0zNi4zYy0yOC41IDAtMzQuMSAxMy41LTM0LjEgMzMuMXYyNy43aDU2LjlsLTcuMyA0NS41aC00OS42djE0NS42YzAgMjMuNSAxNC4zIDM1LjUgMzkuMSAzNS41czM5LjEtMTIuMSAzOS4xLTM1LjVWMTU4LjJoNDguNmw3LjMtNDUuNWgtNTYuMXYtMjcuN2MwLTcuMiA0LjktMTMuNSAxNS45LTEzLjVoMzguN1Y5Nkg0MDMuOGMtNDQuOSAwLTc2LjQtMzYuNi03Ni40LTgxLjVzMzIuNS04MS41IDc2LjQtODEuNWg3NS4yYzEzLjUgMCAyNC42IDEwLjkgMjQuNiAyNC4zVjk2YzAgMTMuNS0xMC45IDI0LjMtMjQuNiAyNC4zSDQzNC4zYzAtMTkuOC0xMC45LTM2LjQtMzIuMS0zNi40cy0zMi4xIDE2LjctMzIuMSAzNi40djI3LjdoLTQ5LjZjLTEzLjUgMC0yNC42IDEwLjktMjQuNiAyNC4zdjQ1LjVjMCAxMy41IDEwLjkgMjQuMyAyNC42IDI0LjNoNDkuNlYzMjQuOWMwLTQ0LjktMzIuNS04MS41LTc2LjQtODEuNXMtNzYuNCAzNi42LTc2LjQgODEuNVY0NjhjMCAxMy41IDEwLjkgMjQuMyAyNC42IDI0LjNoNzUuMmMxMy41IDAgMjQuNi0xMC45IDI0LjYtMjQuM3YtMTQ1LjZjNC41IDQuMiAxMC40IDYuNSAxNy43IDYuNSAyMC42IDAgMzMuMS0xOS41IDMzLjEtNDAuN1YzNjQuOGMwLTE3LjUtMTAuOS0yNC4zLTI0LjYtMjQuM0gzMjR6Ii8+PC9zdmc+",
  instagram:
    "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MTIgNTEyIj48cGF0aCBmaWxsPSIjZDM4YzZiIiBkPSJNMjU2IDY0QzEzMi43IDY0IDY0IDEzMi43IDY0IDI1NnM2OC43IDE5MiAxOTIgMTkyIDE5Mi02OC43IDE5Mi0xOTJT379LjMgNjQgMjU2IDY0em0xNTIuNCAyNzguOWMtMTAuNSAxOC42LTI5LjYgMzEuOC01Mi4zIDM3LjktMjIuOCA2LjItNDcuOSAxMC4xLTczLjggMTAuMS0yNS45IDAtNTEuMS0zLjktNzMuOC0xMC4xLTIyLjctNi4xLTQyLjItMTkuMy01Mi43LTM3LjktMTAuNS0xOC42LTE3LjQtNDAuNi0xNy40LTY0LjcgMC0yNS45IDYuOS00Ny45IDE3LjQtNjYuNSAxMC41LTE4LjYgMjkuNi0zMS44IDUyLjMtMzcuOSAyMi44LTYuMiA0Ny45LTEwLjEgNzMuOC0xMC4xIDI1LjkgMCA1MS4xIDMuOSA3My44IDEwLjEgMjIuNyA2LjEgNDIuMiAxOS4zIDUyLjcgMzcuOSAxMC41IDE4LjYgMTcuNCA0MC42IDE3LjQgNjYuNSAwIDI1LjktNi45IDQ3LjktMTcuNCA2Ni41em0tOTYuNS0yMDcuOGMtMzEuMyAwLTU2LjcgMjUuNC0tNTYuNyA1Ni43IDAgMzEuMyAyNS40IDU2LjcgNTYuNyA1Ni43IDMxLjMgMCA1Ni43LTI1LjQgNTYuNy01Ni43IDAtMzEuMy0yNS40LTU2LjctNTYuNy01Ni43em0yMTQuNS0xLjFjLTEuMyAwLTIuNSAwLjUtMy4zIDEuMy0uOCAwLjgtMS4zIDIuMS0xLjMgMy4zdi4xYzAgMS4zIDAuNSAyLjUgMS4zIDMuMy44IDguOCAyLjEgMS4zIDMuMyAxLjMuMSAwIC4xIDAgLjEgMCAxLjMgMCAyLjUtLjUgMy4zLTEuMy44LS44IDEuMy0yLjEgMS4zLTMuM3YtLjFjMC0xLjMtLjUtMi41LTEuMy0zLjMtLjgtLjgtMi4xLTEuMy0zLjMtMS4zem0tNzMuMyAxNDMuOWMtMjcuOSAwLTUwLjUtMjIuNi0tNTAuNS01MC41IDAtMjcuOSAyMi42LTUwLjUgNTAuNS01MC41IDI3LjkgMCA1MC41IDIyLjYgNTAuNSAyMC41IDAgMjcuOS0yMi42IDUwLjUtNTAuNSAyMC41eiIvPjwvc3ZnPg==",
  github:
    "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MTIgNTEyIj48cGF0aCBmaWxsPSIjMTgxNzE3IiBkPSJNMjU2IDY0QzEzMi43IDY0IDY0IDEzMi43IDY0IDI1NnM2OC43IDE5MiAxOTIgMTkyIDE5Mi02OC43IDE5Mi0xOTJT379LjMgNjQgMjU2IDY0em0xNjYuNiAxMzguOWMtMTcuOC0xOC44LTM4LjgtMzIuMi02Mi44LTM4LjktMjQuMS02LjctNDkuNy0xMC40LTc1LjgtMTAuNC0yNi4xIDAtNTEuNyAzLjktNzUuOCAxMC40LTI0LjEgNi43LTQ1LjEgMjAuMS02Mi45IDM4LjktMTcuOCAxOC44LTI5LjUgNDMuNC0yOS41IDcxLjcgMCAyNi4xIDExLjcgNDguMiAyOS41IDY3LDE3LjggMTguOCAzOC44IDMyLjIgNjIuOSAzOC45IDI0LjEgNi43IDQ5LjcgMTAuNCA3NS44IDEwLjQgMjYuMSAwIDUxLjctMy9kLTc1LjgtMTAuNCAyNC4xLTYuNyA0NS4xLTIwLjEgNjIuOS0zOC45IDE3LjgtMTguOCAyOS41LTQzLjQgMjkuNS03MS43IDAtMjYuMS0xMS43LTQ4LjItMjkuNS02Ny4xem0tMjkuNS0xMy43Yy0xMy42IDAtMjQuNiAxMS0yNC42IDI0LjYgMCAxMy42IDExIDI0LjYgMjQuNiAyNC42IDEzLjYgMCAyNC42LTExIDI0LjYtMjQuNiAwLTEzLjYtMTEtMjQuNi0yNC42LTI0LjZ6bS0xMjcuMiAwYy0xMy42IDAtMjQuNiAxMS0yNC42IDI0LjYgMCAxMy42IDExIDI0LjYgMjQuNiAyNC42IDEzLjYgMCAyNC42LTExIDI0LjYtMjQuNiAwLTEzLjYtMTEtMjQuNi0yNC42LTI0LjZ6Ii8+PC9zdmc+",
};

// --- Palette (draggable source) ---
const usePalette = () =>
  useMemo(
    () => [
      {
        id: "name",
        label: "Name",
        placeholder: "{{name}}",
        type: "text",
        icon: FiUser,
      },
      {
        id: "email",
        label: "Email",
        placeholder: "{{email}}",
        type: "text",
        icon: FiMail,
      },
      {
        id: "phone",
        label: "Phone",
        placeholder: "{{phone}}",
        type: "text",
        icon: FiPhone,
      },
      {
        id: "role",
        label: "Role/Title",
        placeholder: "{{role}}",
        type: "text",
        icon: FiBriefcase,
      },
      {
        id: "website",
        label: "Website",
        placeholder: "{{website}}",
        type: "text",
        icon: FiGlobe,
      },
      {
        id: "address",
        label: "Address",
        placeholder: "{{address}}",
        type: "text",
        icon: FiMapPin,
      },
      {
        id: "user_image",
        label: "User Image",
        placeholder: "{{user_image}}",
        type: "image",
        icon: FiImage,
      },
      {
        id: "company_logo",
        label: "Company Logo",
        placeholder: "{{company_logo}}",
        type: "image",
        icon: FiImage,
      },
      { id: "divider", label: "Divider", type: "divider", icon: FiMinus },
      { id: "spacer", label: "Spacer", type: "spacer", icon: FiType },
      {
        id: "social",
        label: "Social Icons",
        type: "social",
        icon: FiShare2,
        options: [
          {
            id: "linkedin",
            placeholder: "{{linkedin_url}}",
            icon: FiLinkedin,
            data: SOCIAL_ASSETS.linkedin,
          },
          {
            id: "twitter",
            placeholder: "{{twitter_url}}",
            icon: FiTwitter,
            data: SOCIAL_ASSETS.twitter,
          },
          {
            id: "facebook",
            placeholder: "{{facebook_url}}",
            icon: FiFacebook,
            data: SOCIAL_ASSETS.facebook,
          },
          {
            id: "instagram",
            placeholder: "{{instagram_url}}",
            icon: FiInstagram,
            data: SOCIAL_ASSETS.instagram,
          },
          {
            id: "github",
            placeholder: "{{github_url}}",
            icon: FiGithub,
            data: SOCIAL_ASSETS.github,
          },
        ],
      },
      {
        id: "button",
        label: "CTA Button",
        type: "button",
        icon: FiLink,
        textPlaceholder: "{{button_text}}",
        urlPlaceholder: "{{button_url}}",
      },
    ],
    []
  );

// --- Generate email-safe HTML (table + inline styles) ---
const generateEmailHtml = (elements, theme) => {
  const { color, fontSize, fontFamily, accent } = theme;

  const styles = {
    wrapper: "width:100%;margin:0;padding:0;background:#f7f7f7;",
    container:
      "width:600px;margin:0 auto;background:#ffffff;border-collapse:collapse;border:1px solid #e5e7eb;",
    td: `font-family:${fontFamily};font-size:${fontSize};color:${color};line-height:1.35;padding:6px 4px;`,
    img: "display:block;border:none;outline:none;text-decoration:none;",
    socialImg:
      "width:22px;height:22px;display:inline-block;border:none;vertical-align:middle;",
    divider:
      "border-top:1px solid #e5e7eb;height:1px;line-height:1px;font-size:0;",
    spacer: "height:10px;line-height:10px;font-size:0;",
    button: `background:${accent};color:#ffffff;text-decoration:none;padding:8px 14px;border-radius:6px;display:inline-block;`,
  };

  let html = "";
  html += `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="${styles.wrapper}">`;
  html += `<tr><td align="center"><table role="presentation" cellpadding="0" cellspacing="0" border="0" style="${styles.container}">`;

  elements.forEach((el) => {
    if (el.type === "text") {
      html += `<tr><td style="${styles.td}">${el.placeholder}</td></tr>`;
    } else if (el.type === "image") {
      const alt = el.id === "company_logo" ? "Company Logo" : "User Image";
      html += `<tr><td style="${styles.td}"><img alt="${alt}" src="${
        el.placeholder
      }" style="${styles.img} max-width:120px;height:auto;border-radius:${
        el.id === "user_image" ? "50%" : "0"
      };" /></td></tr>`;
    } else if (el.type === "divider") {
      html += `<tr><td style="${styles.divider}">&nbsp;</td></tr>`;
    } else if (el.type === "spacer") {
      html += `<tr><td style="${styles.spacer}">&nbsp;</td></tr>`;
    } else if (el.type === "social") {
      html += `<tr><td style="${styles.td}">`;
      el.selected.forEach((s) => {
        html += `<a href="${s.placeholder}" style="margin-right:8px;"><img src="${s.data}" alt="${s.id}" style="${styles.socialImg}" /></a>`;
      });
      html += `</td></tr>`;
    } else if (el.type === "button") {
      html += `<tr><td style="${styles.td}"><a href="${el.urlPlaceholder}" style="${styles.button}">${el.textPlaceholder}</a></td></tr>`;
    }
  });

  html += `</table></td></tr></table>`;
  return html;
};

const AdminTemplateBuilder = () => {
  const dispatch = useDispatch();
  const { loading, error } = useSelector((s) => s.template);

  const palette = usePalette();

  const [elements, setElements] = useState([]);
  const [templateName, setTemplateName] = useState("");
  const [category, setCategory] = useState("creative");

  const [theme, setTheme] = useState({
    color: "#333333",
    fontSize: "12px",
    fontFamily: "Arial, sans-serif",
    accent: "#2563eb",
  });

  const [socialModalOpen, setSocialModalOpen] = useState(false);
  const [selectedSocials, setSelectedSocials] = useState([]);

  // Copy from palette to canvas OR reorder within canvas
  const onDragEnd = useCallback(
    (result) => {
      const { source, destination, draggableId } = result;
      if (!destination) return;

      // Reorder inside canvas
      if (
        source.droppableId === "canvas" &&
        destination.droppableId === "canvas"
      ) {
        const next = Array.from(elements);
        const [moved] = next.splice(source.index, 1);
        next.splice(destination.index, 0, moved);
        setElements(next);
        return;
      }

      // Add from palette to canvas
      if (source.droppableId === "elements") {
        const item = palette.find((p) => p.id === draggableId);
        if (!item) return;

        if (item.type === "social") {
          setSocialModalOpen(true);
        } else {
          setElements((prev) => [...prev, { ...item, uid: uuidv4() }]);
        }
      }
    },
    [elements, palette]
  );

  const handleSocialSelect = useCallback(() => {
    if (selectedSocials.length > 0) {
      const socialPalette = palette.find((el) => el.id === "social");
      const chosen = socialPalette.options.filter((o) =>
        selectedSocials.includes(o.id)
      );
      const socialElement = {
        ...socialPalette,
        uid: uuidv4(),
        selected: chosen,
      };
      setElements((prev) => [...prev, socialElement]);
    }
    setSelectedSocials([]);
    setSocialModalOpen(false);
  }, [selectedSocials, palette]);

  const handleRemove = useCallback((uid) => {
    setElements((prev) => prev.filter((el) => el.uid !== uid));
  }, []);

  // Compute placeholders for save
  const computePlaceholders = useCallback(() => {
    const set = new Set();
    elements.forEach((el) => {
      if (el.type === "text" || el.type === "image") {
        set.add(el.placeholder);
      } else if (el.type === "button") {
        set.add(el.textPlaceholder);
        set.add(el.urlPlaceholder);
      } else if (el.type === "social") {
        el.selected.forEach((s) => set.add(s.placeholder));
      }
    });
    return Array.from(set);
  }, [elements]);

  const htmlContent = useMemo(
    () => generateEmailHtml(elements, theme),
    [elements, theme]
  );

  const handleSave = useCallback(() => {
    if (!templateName.trim()) {
      toast.error("Template name is required");
      return;
    }
    if (elements.length === 0) {
      toast.error("Add at least one element to the template");
      return;
    }

    const placeholders = computePlaceholders();

    // Keep existing Redux flow (slice will package payload).
    // We provide what it needs: name, category, placeholders, html_content
    dispatch(
      addTemplate({
        name: templateName.trim(),
        thumbnail: "",
        category,
        placeholders,
        html: htmlContent, // <-- matches templateSlice/addTemplate
        // keep the extra tokens mirror if you like
        tokens: { html: htmlContent, placeholders, category },
      })
    )
      .unwrap()
      .then(() => {
        toast.success("Template saved");
        setElements([]);
        setTemplateName("");
      })
      .catch((err) => {
        toast.error(err || "Failed to save template");
      });
  }, [
    templateName,
    category,
    elements.length,
    computePlaceholders,
    htmlContent,
    dispatch,
  ]);

  // Surface any async errors
  React.useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearTemplateError());
    }
  }, [error, dispatch]);

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex flex-col lg:flex-row gap-4 p-4">
        {/* Palette */}
        <div className="lg:w-1/4 w-full bg-gray-50 p-4 border rounded">
          <h2 className="text-lg font-bold mb-4">Elements</h2>
          <Droppable droppableId="elements" isDropDisabled>
            {(provided) => (
              <div ref={provided.innerRef} {...provided.droppableProps}>
                {palette.map((el, index) => {
                  const Icon = el.icon;
                  return (
                    <Draggable key={el.id} draggableId={el.id} index={index}>
                      {(p) => (
                        <div
                          ref={p.innerRef}
                          {...p.draggableProps}
                          {...p.dragHandleProps}
                          className="flex items-center gap-2 p-2 mb-2 bg-white border rounded hover:bg-gray-100 cursor-grab"
                        >
                          <Icon className="text-gray-600" />
                          <span>{el.label}</span>
                        </div>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
              </div>
            )}
          </Droppable>

          {/* Theme */}
          <div className="mt-6 space-y-3">
            <h3 className="font-semibold">Theme</h3>
            <div>
              <label className="block text-sm">Font Family</label>
              <input
                type="text"
                value={theme.fontFamily}
                onChange={(e) =>
                  setTheme((t) => ({ ...t, fontFamily: e.target.value }))
                }
                className="w-full p-2 border rounded"
                placeholder="Arial, sans-serif"
              />
            </div>
            <div>
              <label className="block text-sm">Text Color</label>
              <input
                type="color"
                value={theme.color}
                onChange={(e) =>
                  setTheme((t) => ({ ...t, color: e.target.value }))
                }
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm">Font Size</label>
              <input
                type="text"
                value={theme.fontSize}
                onChange={(e) =>
                  setTheme((t) => ({ ...t, fontSize: e.target.value }))
                }
                className="w-full p-2 border rounded"
                placeholder="12px"
              />
            </div>
            <div>
              <label className="block text-sm">Accent (Buttons)</label>
              <input
                type="color"
                value={theme.accent}
                onChange={(e) =>
                  setTheme((t) => ({ ...t, accent: e.target.value }))
                }
                className="w-full"
              />
            </div>
          </div>
        </div>

        {/* Canvas */}
        <div className="lg:w-2/4 w-full">
          <h2 className="text-lg font-bold mb-2">Template Canvas</h2>
          <Droppable droppableId="canvas">
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="min-h-[420px] bg-gray-50 p-4 border rounded"
              >
                {elements.map((el, index) => {
                  const Icon =
                    palette.find((p) => p.id === el.id)?.icon || FiType;
                  return (
                    <Draggable key={el.uid} draggableId={el.uid} index={index}>
                      {(p) => (
                        <div
                          ref={p.innerRef}
                          {...p.draggableProps}
                          {...p.dragHandleProps}
                          className="p-2 mb-2 bg-white border rounded flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <Icon className="text-gray-600" />
                            <span>
                              {el.label}{" "}
                              {el.type === "text" && (
                                <em className="text-xs text-gray-500">
                                  ({el.placeholder})
                                </em>
                              )}
                              {el.type === "image" && (
                                <em className="text-xs text-gray-500">
                                  (src: {el.placeholder})
                                </em>
                              )}
                              {el.type === "button" && (
                                <em className="text-xs text-gray-500">
                                  ({el.textPlaceholder} → {el.urlPlaceholder})
                                </em>
                              )}
                              {el.type === "social" && (
                                <span className="text-xs text-gray-500">
                                  [{el.selected.map((s) => s.id).join(", ")}]
                                </span>
                              )}
                            </span>
                          </div>
                          <button
                            aria-label="Remove"
                            onClick={() => handleRemove(el.uid)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <FiTrash2 />
                          </button>
                        </div>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
                {elements.length === 0 && (
                  <div className="text-center text-gray-500 py-24">
                    Drag elements from the left to build your template.
                  </div>
                )}
              </div>
            )}
          </Droppable>
        </div>

        {/* Preview & Save */}
        <div className="lg:w-1/4 w-full">
          <h2 className="text-lg font-bold mb-2">Preview & Save</h2>

          <div className="mb-3">
            <label className="block text-sm">Template Name</label>
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="w-full p-2 border rounded"
              placeholder="e.g., Clean Blue"
            />
          </div>
          <div className="mb-3">
            <label className="block text-sm">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="creative">Creative</option>
              <option value="professional">Professional</option>
              <option value="General">General</option>
            </select>
          </div>

          <div
            className="border rounded p-3 mb-3 bg-white"
            style={{ maxHeight: 300, overflow: "auto" }}
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={loading}
              className={`flex-1 bg-blue-600 text-white p-2 rounded hover:bg-blue-700 ${
                loading ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              {loading ? "Saving..." : "Save Template"}
            </button>
            <button
              onClick={async () => {
                try {
                  const ok = await copyHtml(htmlContent, undefined, {
                    inlineImages: false,
                    inlineCss: true,
                  });
                  if (ok) toast.success("Copied HTML (mobile-safe)");
                  else toast.error("Copy failed. Try desktop browser.");
                } catch {
                  toast.error("Copy failed");
                }
              }}
              className="flex-1 bg-gray-100 p-2 rounded hover:bg-gray-200"
            >
              Copy HTML
            </button>
          </div>
        </div>

        {/* Social selection modal */}
        {socialModalOpen && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg w-full max-w-md">
              <h3 className="text-lg font-bold mb-4">Select Social Icons</h3>
              <div className="grid grid-cols-2 gap-3">
                {palette
                  .find((x) => x.id === "social")
                  .options.map((opt) => {
                    const Icon = opt.icon;
                    const checked = selectedSocials.includes(opt.id);
                    return (
                      <label
                        key={opt.id}
                        className={`flex items-center gap-2 p-2 border rounded cursor-pointer ${
                          checked ? "bg-blue-50 border-blue-300" : ""
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedSocials((prev) => [...prev, opt.id]);
                            } else {
                              setSelectedSocials((prev) =>
                                prev.filter((id) => id !== opt.id)
                              );
                            }
                          }}
                        />
                        <Icon />
                        <span className="capitalize">{opt.id}</span>
                      </label>
                    );
                  })}
              </div>
              <div className="flex gap-2 justify-end mt-4">
                <button
                  onClick={() => {
                    setSelectedSocials([]);
                    setSocialModalOpen(false);
                  }}
                  className="px-4 py-2 rounded bg-gray-100 hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSocialSelect}
                  className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
                >
                  Add Selected
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DragDropContext>
  );
};

export default AdminTemplateBuilder;

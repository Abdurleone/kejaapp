import { useRef, useState } from "react";
import {
  addPropertyImage,
  removePropertyImage,
  resolveAssetUrl,
  uploadPropertyImage,
} from "../../app-utils.js";

export default function PropertyImageManager({ property, apiBaseUrl, onPropertyUpdated }) {
  const [urlValue, setUrlValue] = useState("");
  const [altValue, setAltValue] = useState("");
  const [uploading, setUploading] = useState(false);
  const [addingUrl, setAddingUrl] = useState(false);
  const [removingId, setRemovingId] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const fileInputRef = useRef(null);

  const applyImageResult = ({ data, imageReview }) => {
    onPropertyUpdated(data);
    setNotice(
      imageReview?.status && imageReview.status !== "clear"
        ? "Image added, but it was flagged as a possible duplicate for admin review."
        : "Image added."
    );
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setError("");
    setNotice("");
    setUploading(true);

    try {
      const reader = new FileReader();
      const dataUrl = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("Could not read that file."));
        reader.readAsDataURL(file);
      });

      const result = await uploadPropertyImage(property._id, {
        fileName: file.name,
        mimeType: file.type,
        data: dataUrl,
      });
      applyImageResult(result);
    } catch (err) {
      setError(err.message || "Could not upload this image.");
    } finally {
      setUploading(false);
    }
  };

  const handleUrlSubmit = async (event) => {
    event.preventDefault();
    if (!urlValue.trim()) return;

    setError("");
    setNotice("");
    setAddingUrl(true);

    try {
      const result = await addPropertyImage(property._id, {
        url: urlValue.trim(),
        alt: altValue.trim() || undefined,
      });
      applyImageResult(result);
      setUrlValue("");
      setAltValue("");
    } catch (err) {
      setError(err.message || "Could not add this image.");
    } finally {
      setAddingUrl(false);
    }
  };

  const handleRemove = async (imageId) => {
    setError("");
    setNotice("");
    setRemovingId(imageId);

    try {
      const updated = await removePropertyImage(property._id, imageId);
      onPropertyUpdated(updated);
    } catch (err) {
      setError(err.message || "Could not remove this image.");
    } finally {
      setRemovingId(null);
    }
  };

  const images = property.images || [];

  return (
    <div className="panel stack">
      <h3>Photos</h3>

      {images.length === 0 ? (
        <p className="muted-copy">No photos yet. Add one below.</p>
      ) : (
        <div className="image-thumb-grid">
          {images.map((image) => (
            <div className="image-thumb" key={image._id}>
              <img src={resolveAssetUrl(image.url, apiBaseUrl)} alt={image.alt || ""} />
              <button
                className="secondary-button"
                type="button"
                disabled={removingId === image._id}
                onClick={() => handleRemove(image._id)}
              >
                {removingId === image._id ? "Removing..." : "Remove"}
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="header-actions">
        <button
          className="primary-button"
          type="button"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? "Uploading..." : "Add photo"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          hidden
          onChange={handleFileChange}
        />
      </div>

      <form className="header-actions" onSubmit={handleUrlSubmit}>
        <input
          type="url"
          placeholder="Or paste an image URL"
          value={urlValue}
          onChange={(event) => setUrlValue(event.target.value)}
        />
        <input
          type="text"
          placeholder="Alt text (optional)"
          value={altValue}
          onChange={(event) => setAltValue(event.target.value)}
        />
        <button className="secondary-button" type="submit" disabled={addingUrl || !urlValue.trim()}>
          {addingUrl ? "Adding..." : "Add by URL"}
        </button>
      </form>

      {error && <p className="error-text">{error}</p>}
      {!error && notice && <p className="success-text">{notice}</p>}
    </div>
  );
}

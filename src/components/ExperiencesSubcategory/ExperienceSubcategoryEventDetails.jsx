import React, { useEffect, useState, useRef } from "react";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useParams, Link } from "react-router-dom";
import Swal from "sweetalert2";
import {
  addExperienceSubcategoryEvent,
  updateExperienceSubcategoryEvent,
  fetchExperienceSubcategoryEventsByGuid,
  deleteExperienceSubcategoryEvent,
} from "../../services/experienceSubcategoryEventServices";
import {
  fetchExperienceSubcategoryPageByGuid,
  updateExperienceSubcategoryPage,
} from "../../services/experienceSubcategoryPageServices";
import allImages from "../../assets/images-import";
import { handleErrors } from "../../utils/errorHandler";
import { confirmDelete } from "../Common/OtherElements/confirmDeleteClone";
import { Loading } from "../Common/OtherElements/Loading";
import { TableDataStatusError } from "../Common/OtherElements/TableDataStatusError";
import TableHeader from "../Common/TableComponent/TableHeader";
import { getFullImageUrl } from "../../utils/imageUrl";

const initialFormState = {
  Title: "",
  Description: "",
  Image: "",
  ImagePreview: "",
  DisplayOrder: "",
};

const initialSectionFormState = {
  CtaTitle: "",
  CtaDescription: "",
  ButtonText: "",
};

export const ExperienceSubcategoryEventDetails = () => {
  const { experienceSubcategoryGuid } = useParams();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState(initialFormState);
  const [editingId, setEditingId] = useState(null);
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const eventImageInputRef = useRef(null);

  // Page-level "Call To Action" content (plus ButtonText), edited here since
  // events are displayed alongside it on the experience subcategory page.
  const [pageRecord, setPageRecord] = useState(null);
  const [sectionFormData, setSectionFormData] = useState(initialSectionFormState);
  const [sectionLoading, setSectionLoading] = useState(true);
  const [isSectionSaving, setIsSectionSaving] = useState(false);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const result = await fetchExperienceSubcategoryEventsByGuid(experienceSubcategoryGuid);
      setEvents(result || []);
    } catch (error) {
      handleErrors(error);
    } finally {
      setLoading(false);
    }
  };

  const loadSection = async () => {
    setSectionLoading(true);
    try {
      const data = await fetchExperienceSubcategoryPageByGuid(experienceSubcategoryGuid);
      if (data) {
        setPageRecord(data);
        setSectionFormData({
          CtaTitle: data.ctaTitle || "",
          CtaDescription: data.ctaDescription || "",
          ButtonText: data.buttonText || "",
        });
      }
    } catch (error) {
      handleErrors(error);
    } finally {
      setSectionLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
    loadSection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [experienceSubcategoryGuid]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      // Keep DisplayOrder as the raw string while typing so the field can be
      // cleared/edited freely; it's coerced to a number on submit.
      [name]: value,
    }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFormData((prev) => ({
      ...prev,
      Image: file,
      ImagePreview: URL.createObjectURL(file),
    }));
    setErrors((prev) => ({ ...prev, Image: "" }));
  };

  const validate = () => {
    const newErrors = {};
    let valid = true;
    if (!formData.Title?.trim()) {
      newErrors.Title = "Title is required";
      valid = false;
    }
    if (!formData.Description?.trim()) {
      newErrors.Description = "Description is required";
      valid = false;
    }
    setErrors(newErrors);
    return valid;
  };

  const resetForm = () => {
    setFormData(initialFormState);
    setEditingId(null);
    setErrors({});
    // File inputs are uncontrolled - clearing formData alone doesn't clear
    // the browser's displayed "chosen file" label, so reset it explicitly.
    if (eventImageInputRef.current) {
      eventImageInputRef.current.value = "";
    }
  };

  const toNumber = (value) => (value === "" || value === null ? 0 : Number(value));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSaving(true);
    try {
      const payload = new FormData();
      payload.append("Title", formData.Title);
      payload.append("Description", formData.Description);
      payload.append("DisplayOrder", toNumber(formData.DisplayOrder));
      if (formData.Image) {
        payload.append("Image", formData.Image);
      }

      if (editingId) {
        payload.append("Id", editingId);
        await updateExperienceSubcategoryEvent(payload);
        toast.success("Experience event updated successfully!");
      } else {
        payload.append("ExperienceSubcategoryGuid", experienceSubcategoryGuid);
        await addExperienceSubcategoryEvent(payload);
        toast.success("Experience event added successfully!");
      }
      resetForm();
      loadEvents();
    } catch (error) {
      handleErrors(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setFormData({
      Title: item.title || "",
      Description: item.description || "",
      Image: "",
      ImagePreview: getFullImageUrl(item.image),
      DisplayOrder:
        item.displayOrder === null || item.displayOrder === undefined
          ? ""
          : String(item.displayOrder),
    });
    // A new file hasn't been chosen for this edit yet, so clear any
    // leftover selection from a previous add/edit in the same input.
    if (eventImageInputRef.current) {
      eventImageInputRef.current.value = "";
    }
  };

  const handleDelete = async (id) => {
    const confirmed = await confirmDelete("Experience Subcategory Event");
    if (confirmed) {
      try {
        await deleteExperienceSubcategoryEvent(id);
        setEvents((prev) => prev.filter((item) => item.id !== id));
        Swal.fire("Deleted!", "The experience subcategory event has been deleted successfully.", "success");
      } catch (error) {
        handleErrors(error);
      }
    }
  };

  // --- Call To Action section (page-level) handlers ---

  const handleSectionInputChange = (e) => {
    const { name, value } = e.target;
    setSectionFormData((prev) => ({ ...prev, [name]: value }));
  };

  // The update endpoint expects the whole page record, so the rest of the
  // fields are carried over unchanged from what was last fetched, and only
  // the Cta/ButtonText fields are overridden. No image fields belong to this
  // section, so existing images on the page (including OgImage) are
  // naturally left untouched.
  const handleSectionSubmit = async (e) => {
    e.preventDefault();
    if (!pageRecord) return;

    setIsSectionSaving(true);
    try {
      const payload = new FormData();
      payload.append("Id", pageRecord.id);
      payload.append("ExperienceSubcategoryName", pageRecord.experienceSubcategoryName || "");
      payload.append("BannerTitle", pageRecord.bannerTitle || "");
      payload.append("BannerDesc", pageRecord.bannerDesc || "");
      payload.append("Title", pageRecord.title || "");
      payload.append("Description", pageRecord.description || "");
      payload.append("WhyChooseTitle", pageRecord.whyChooseTitle || "");
      payload.append("WhyChooseDesc", pageRecord.whyChooseDesc || "");
      payload.append("CtaTitle", sectionFormData.CtaTitle);
      payload.append("CtaDescription", sectionFormData.CtaDescription);
      payload.append("ButtonText", sectionFormData.ButtonText);
      payload.append("LightsTitle", pageRecord.lightsTitle || "");
      payload.append("LightsSubTitle", pageRecord.lightsSubTitle || "");
      payload.append("LightsDescription", pageRecord.lightsDescription || "");
      payload.append("PageTitle", pageRecord.pageTitle || "");
      payload.append("MetaKeys", pageRecord.metaKeys || "");
      payload.append("MetaDesc", pageRecord.metaDesc || "");
      payload.append("OgTitle", pageRecord.ogTitle || "");
      payload.append("OgDesc", pageRecord.ogDesc || "");
      payload.append("SchemaMarkup",pageRecord.schemaMarkup ||"");
      payload.append("CardTitle",pageRecord.cardTitle ||"")

      await updateExperienceSubcategoryPage(payload);
      toast.success("Call To Action section updated successfully!");
      loadSection();
    } catch (error) {
      handleErrors(error);
    } finally {
      setIsSectionSaving(false);
    }
  };

  return (
    <>
      <div className="row">
        <div className="col-12">
          <div className="page-title-box d-sm-flex align-items-center justify-content-between">
            <h4 className="mb-sm-0">Manage Experience Subcategory Events</h4>
            <div className="page-title-right">
              <ol className="breadcrumb m-0">
                <li className="breadcrumb-item">
                  <Link to="/">
                    <i className="ri-home-2-fill"></i>
                  </Link>
                </li>
                <li className="breadcrumb-item">
                  <Link to="/manage-experience-subcategory">Manage Experience Subcategory Pages</Link>
                </li>
                <li className="breadcrumb-item">Events</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      <div className="card mt-xxl-n5 p-3">
        <div className="card-header-wrapper p-1">
          <h5 className="blogs-heading">Call To Action</h5>
        </div>
        {sectionLoading ? (
          <Loading />
        ) : (
          <form onSubmit={handleSectionSubmit} className="mt-3">
            <div className="mb-3">
              <label className="form-label">Cta Title</label>
              <input
                type="text"
                name="CtaTitle"
                value={sectionFormData.CtaTitle}
                placeholder="Enter Cta Title"
                onChange={handleSectionInputChange}
                className="form-control"
              />
            </div>
            <div className="mb-3">
              <label className="form-label">Cta Description</label>
              <textarea
                name="CtaDescription"
                value={sectionFormData.CtaDescription}
                placeholder="Enter Cta Description"
                onChange={handleSectionInputChange}
                className="form-control"
                rows="3"
              ></textarea>
            </div>
            <div className="mb-3">
              <label className="form-label">Button Text</label>
              <input
                type="text"
                name="ButtonText"
                value={sectionFormData.ButtonText}
                placeholder="Enter Button Text"
                onChange={handleSectionInputChange}
                className="form-control"
              />
            </div>
            <button type="submit" className="btn btn-secondary" disabled={isSectionSaving}>
              {isSectionSaving ? "Saving" : "Save Call To Action"}
            </button>
          </form>
        )}
      </div>

      <div className="card mt-3 p-3">
        <div className="card-header-wrapper p-1">
          <h5 className="blogs-heading">
            {editingId ? "Edit Experience Subcategory Event" : "Add Experience Subcategory Event"}
          </h5>
        </div>
        <form onSubmit={handleSubmit} className="mt-3">
          <div className="row">
            <div className="mb-3 col-lg-8">
              <label className="form-label">
                Event Title <span className="required-field">*</span>
              </label>
              <input
                type="text"
                name="Title"
                value={formData.Title}
                placeholder="Enter Event Title"
                onChange={handleInputChange}
                className={`form-control ${errors.Title ? "is-invalid" : ""}`}
              />
              {errors.Title && <div className="invalid-feedback">{errors.Title}</div>}
            </div>
            <div className="mb-3 col-lg-4">
              <label className="form-label">Display Order</label>
              <input
                type="number"
                name="DisplayOrder"
                value={formData.DisplayOrder}
                placeholder="Enter Display Order"
                onChange={handleInputChange}
                className="form-control"
              />
            </div>
            <div className="mb-3 col-lg-12">
              <label className="form-label">
                Event Description <span className="required-field">*</span>
              </label>
              <textarea
                name="Description"
                value={formData.Description}
                placeholder="Enter Event Description"
                onChange={handleInputChange}
                className={`form-control ${errors.Description ? "is-invalid" : ""}`}
                rows="3"
              ></textarea>
              {errors.Description && (
                <div className="invalid-feedback">{errors.Description}</div>
              )}
            </div>
            <div className="mb-3 col-lg-12">
              <label className="form-label">Event Image</label>
              <div className="d-flex align-items-center gap-3">
                <img
                  src={formData.ImagePreview || allImages.DefultImage}
                  alt="Event Preview"
                  className="rounded img-thumbnail"
                  style={{ width: 96, height: 96, objectFit: "cover" }}
                />
                <div>
                  <input
                    ref={eventImageInputRef}
                    type="file"
                    accept="image/*"
                    className={`form-control ${errors.Image ? "is-invalid" : ""}`}
                    onChange={handleImageChange}
                  />
                  <small className="text-muted d-block mt-1">
                    Recommended: 4:3, e.g. 800×600px, max 3MB
                  </small>
                </div>
              </div>
              {errors.Image && <div className="invalid-feedback d-block">{errors.Image}</div>}
            </div>
          </div>
          <button type="submit" className="btn btn-secondary" disabled={isSaving}>
            {isSaving
              ? editingId
                ? "Updating"
                : "Saving"
              : editingId
              ? "Update Event"
              : "Add Event"}
          </button>
          {editingId && (
            <button type="button" className="btn btn-danger ms-1" onClick={resetForm}>
              Cancel
            </button>
          )}
        </form>
      </div>

      <div className="card mt-3">
        <div className="card-body">
          {loading ? (
            <div>Loading...</div>
          ) : (
            <div className="table-responsive">
              <table className="table align-middle table-bordered">
                <TableHeader
                  columns={["#", "Image", "Title", "Description", "Display Order", "Action"]}
                />
                <tbody>
                  {events.length === 0 ? (
                    <TableDataStatusError colspan="6" />
                  ) : (
                    events
                      .slice()
                      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
                      .map((item, index) => (
                        <tr key={item.id}>
                          <td>{index + 1}</td>
                          <td>
                            <img
                              src={getFullImageUrl(item.image) || allImages.DefultImage}
                              alt={item.title}
                              style={{ width: 48, height: 48, objectFit: "cover" }}
                              className="rounded"
                            />
                          </td>
                          <td>{item.title}</td>
                          <td>{item.description}</td>
                          <td>{item.displayOrder}</td>
                          <td>
                            <div className="d-flex gap-1">
                              <button
                                type="button"
                                className="btn btn-sm btn-primary"
                                onClick={() => handleEdit(item)}
                              >
                                <i className="ri-pencil-line"></i>
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-danger"
                                onClick={() => handleDelete(item.id)}
                              >
                                <i className="ri-delete-bin-line"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
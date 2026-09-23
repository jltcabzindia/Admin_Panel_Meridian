import React, { useState, useEffect, useCallback } from 'react';
import Select from 'react-select';
import { createExperienceSubcategory, updateExperienceSubcategory, fetchExperienceSubcategoryById } from '../../services/experienceSubcategoryServices';
import { fetchExperienceCategories } from '../../services/experienceCategoryServices';
import { handleErrors } from '../../utils/errorHandler';
import { toast } from 'react-toastify';
import "react-toastify/dist/ReactToastify.css";
import ComponentHeader from '../Common/OtherElements/ComponentHeader';

// Base host to prepend to image paths returned by the API (they come back
// as relative paths, e.g. "uploads/experience/foo.png").
const IMAGE_BASE_URL = 'http://api2.meridianbythelawns.com/';

const buildImageUrl = (path) => {
  if (!path) return '';
  // Already a full/blob URL — don't double-prefix it.
  if (/^(https?:)?\/\//i.test(path) || path.startsWith('blob:')) {
    return path;
  }
  return `${IMAGE_BASE_URL}${path.replace(/^\/+/, '')}`;
};

// Turns "Enter Experience Subcategory Name" into "enter-experience-subcategory-name".
const slugify = (str) =>
  str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')   // strip special chars
    .replace(/\s+/g, '-')           // spaces -> hyphens
    .replace(/-+/g, '-');           // collapse repeats

const EMPTY_FORM = {
  experienceCategoryId: '',
  experienceSubcategoryName: '',
  experienceSubcategoryUrl: '',
  experienceSubcategoryShortDesc: '',
  displayOrder: '',
};

const validateExperienceSubcategory = (formData) => {
  const errors = { experienceCategoryId: '', experienceSubcategoryName: '', experienceSubcategoryUrl: '', displayOrder: '' };

  if (!formData.experienceCategoryId) {
    errors.experienceCategoryId = 'Experience Category is required.';
  }

  if (!formData.experienceSubcategoryName || !formData.experienceSubcategoryName.trim()) {
    errors.experienceSubcategoryName = 'Experience Subcategory Name is required.';
  }

  if (!formData.experienceSubcategoryUrl || !formData.experienceSubcategoryUrl.trim()) {
    errors.experienceSubcategoryUrl = 'Experience Subcategory URL is required.';
  }

  if (formData.displayOrder === '' || formData.displayOrder === null || formData.displayOrder === undefined) {
    errors.displayOrder = 'Display Order is required.';
  } else if (isNaN(formData.displayOrder) || Number(formData.displayOrder) < 0) {
    errors.displayOrder = 'Display Order must be a valid non-negative number.';
  }

  const valid = !errors.experienceCategoryId && !errors.experienceSubcategoryName && !errors.experienceSubcategoryUrl && !errors.displayOrder;
  return { valid, errors };
};

// Meridian theme tokens, kept in one place so the react-select
// custom styles stay in sync with the global CSS theme.
const THEME = {
  primary: '#1d4d37',
  primaryHover: '#17402d',
  primaryActive: '#123626',
  secondary: '#c9a24b',
  secondarySoft: 'rgba(201, 162, 75, 0.15)',
  primarySoft: 'rgba(29, 77, 55, 0.08)',
  danger: '#dc3545',
  border: '#ced4da',
  text: '#212529',
  muted: '#8c9296',
};

const experienceCategorySelectStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: 38,
    borderRadius: 6,
    borderColor: state.selectProp?.isInvalid
      ? THEME.danger
      : state.isFocused
        ? THEME.primary
        : THEME.border,
    boxShadow: state.isFocused ? `0 0 0 0.15rem ${THEME.primarySoft}` : 'none',
    '&:hover': {
      borderColor: state.selectProp?.isInvalid ? THEME.danger : THEME.primary,
    },
    backgroundColor: '#fff',
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected
      ? THEME.primary
      : state.isFocused
        ? THEME.primarySoft
        : '#fff',
    color: state.isSelected ? '#fff' : THEME.text,
    cursor: 'pointer',
    ':active': {
      backgroundColor: state.isSelected ? THEME.primaryActive : THEME.secondarySoft,
    },
  }),
  singleValue: (base) => ({
    ...base,
    color: THEME.text,
  }),
  placeholder: (base) => ({
    ...base,
    color: THEME.muted,
  }),
  dropdownIndicator: (base, state) => ({
    ...base,
    color: state.isFocused ? THEME.primary : THEME.muted,
    '&:hover': { color: THEME.primary },
  }),
  clearIndicator: (base) => ({
    ...base,
    color: THEME.muted,
    '&:hover': { color: THEME.danger },
  }),
  indicatorSeparator: (base) => ({
    ...base,
    backgroundColor: THEME.border,
  }),
  menu: (base) => ({
    ...base,
    borderRadius: 6,
    overflow: 'hidden',
    boxShadow: '0 4px 14px rgba(18, 54, 38, 0.15)',
    zIndex: 20,
  }),
  input: (base) => ({
    ...base,
    color: THEME.text,
  }),
};

export const AddExperienceSubcategory = ({ editMode = false, initialData = {}, onSuccess, setSelectedPageGroup, setEditMode }) => {
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({ experienceCategoryId: '', experienceSubcategoryName: '', experienceSubcategoryUrl: '', displayOrder: '' });
  const [apiError, setApiError] = useState('');
  const [isButtonDisabled, setIsButtonDisabled] = useState(false);
  const [experienceCategories, setExperienceCategories] = useState([]);

  // Whether the user has typed directly into the URL field (or we're in edit
  // mode with an existing URL). While false, the URL is auto-derived from
  // the name field; once true, auto-generation stops touching it.
  const [urlManuallyEdited, setUrlManuallyEdited] = useState(false);

  // The actual File object selected for upload (kept separate from formData
  // since it isn't a plain form value).
  const [imageFile, setImageFile] = useState(null);
  // URL used to preview either the newly selected file or the existing image in edit mode.
  const [imagePreview, setImagePreview] = useState('');

  useEffect(() => {
    const loadExperienceCategories = async () => {
      try {
        const categories = await fetchExperienceCategories();
        setExperienceCategories(categories || []);
      } catch (error) {
        handleErrors(error);
      }
    };
    loadExperienceCategories();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (editMode && initialData.id) {
        try {
          const data = await fetchExperienceSubcategoryById(initialData.id);
          setFormData({
            experienceCategoryId: data.experienceCategoryId || '',
            experienceSubcategoryName: data.experienceSubcategoryName || '',
            experienceSubcategoryUrl: data.experienceSubcategoryUrl || '',
            experienceSubcategoryShortDesc: data.experienceSubcategoryShortDesc || '',
            displayOrder: data.displayOrder ?? '',
          });
          // Existing record already has a real URL — don't let further name
          // edits silently regenerate/overwrite it.
          setUrlManuallyEdited(true);
          setImageFile(null);
          setImagePreview(buildImageUrl(data.experienceSubcategoryImage));
        } catch (error) {
          handleErrors(error);
        }
      } else {
        setFormData(EMPTY_FORM);
        setUrlManuallyEdited(false);
        setImageFile(null);
        setImagePreview('');
      }
    };
    fetchData();
  }, [editMode, initialData]);

  // Revoke any object URL we created for a local file preview so we don't leak memory.
  useEffect(() => {
    return () => {
      if (imagePreview && imagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name === 'experienceSubcategoryUrl') {
      // User is typing directly into the URL field — stop auto-generating.
      setUrlManuallyEdited(true);
      setFormData((prevData) => ({ ...prevData, experienceSubcategoryUrl: value }));
      return;
    }

    if (name === 'experienceSubcategoryName') {
      setFormData((prevData) => ({
        ...prevData,
        experienceSubcategoryName: value,
        experienceSubcategoryUrl: urlManuallyEdited
          ? prevData.experienceSubcategoryUrl
          : slugify(value),
      }));
      return;
    }

    setFormData((prevData) => ({ ...prevData, [name]: value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) {
      return;
    }
    setImageFile(file);
    setImagePreview((prev) => {
      if (prev && prev.startsWith('blob:')) {
        URL.revokeObjectURL(prev);
      }
      return URL.createObjectURL(file);
    });
  };

  const categoryOptions = experienceCategories.map((category) => ({
    value: category.id,
    label: category.experienceCategoryName,
  }));

  const selectedCategoryOption =
    categoryOptions.find((opt) => String(opt.value) === String(formData.experienceCategoryId)) || null;

  const handleCategoryChange = (selectedOption) => {
    setFormData((prevData) => ({
      ...prevData,
      experienceCategoryId: selectedOption ? selectedOption.value : '',
    }));
    if (errors.experienceCategoryId) {
      setErrors((prev) => ({ ...prev, experienceCategoryId: '' }));
    }
  };

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    const { valid, errors: validationErrors } = validateExperienceSubcategory(formData);
    setErrors(validationErrors);

    if (valid) {
      setApiError('');
      try {
        if (editMode) {
          setIsButtonDisabled(true);
          await updateExperienceSubcategory({
            id: initialData.id,
            experienceCategoryId: Number(formData.experienceCategoryId),
            experienceSubcategoryName: formData.experienceSubcategoryName,
            experienceSubcategoryUrl: formData.experienceSubcategoryUrl,
            experienceSubcategoryShortDesc: formData.experienceSubcategoryShortDesc,
            experienceSubcategoryImage: imageFile,
            displayOrder: Number(formData.displayOrder),
          });
          toast.success('Experience subcategory updated successfully!');
          setIsButtonDisabled(false);
          setEditMode(false);
        } else {
          setIsButtonDisabled(true);
          await createExperienceSubcategory({
            experienceCategoryId: Number(formData.experienceCategoryId),
            experienceSubcategoryName: formData.experienceSubcategoryName,
            experienceSubcategoryUrl: formData.experienceSubcategoryUrl,
            experienceSubcategoryShortDesc: formData.experienceSubcategoryShortDesc,
            experienceSubcategoryImage: imageFile,
            displayOrder: Number(formData.displayOrder),
          });
          toast.success('Experience subcategory added successfully!');
          setIsButtonDisabled(false);
        }
        setFormData(EMPTY_FORM);
        setUrlManuallyEdited(false);
        setImageFile(null);
        setImagePreview('');
        if (onSuccess) onSuccess();
      } catch (error) {
        handleErrors(error);
        setIsButtonDisabled(false);
      }
    } else {
      console.error('Validation errors:', validationErrors);
    }
  }, [formData, imageFile, editMode, initialData, onSuccess, setEditMode]);

  const handleAddNewClick = () => {
    setFormData(EMPTY_FORM);
    setErrors({ experienceCategoryId: '', experienceSubcategoryName: '', experienceSubcategoryUrl: '', displayOrder: '' });
    setApiError('');
    setUrlManuallyEdited(false);
    setImageFile(null);
    setImagePreview('');
    setSelectedPageGroup(null);
    setEditMode(false);
  };

  return (
    <>
      <ComponentHeader title="Experience Subcategories"/>
      <div className="row">
        <div className="col-xxl-12">
          <div className="card mt-xxl-n5">
            <div className="card-header">
              <h5 className="mb-sm-1 mt-sm-1">{editMode ? 'Update Experience Subcategory' : 'Add Experience Subcategory'}</h5>
            </div>

            <div className="card-body p-4">
              <form onSubmit={handleSubmit} method="POST" encType="multipart/form-data">
                <div className="row">
                  <div className="col-lg-3 col-md-6 col-sm-12">
                    <div className="mb-3">
                      <label htmlFor="experience_category_id" className="form-label">Experience Category <span className='required-field'>*</span></label>
                      <Select
                        inputId="experience_category_id"
                        name="experienceCategoryId"
                        options={categoryOptions}
                        value={selectedCategoryOption}
                        onChange={handleCategoryChange}
                        placeholder="Search or select category..."
                        isClearable
                        isSearchable
                        isDisabled={editMode}
                        styles={experienceCategorySelectStyles}
                        selectProp={{ isInvalid: !!errors.experienceCategoryId }}
                        noOptionsMessage={() => 'No matching categories'}
                      />
                      {errors.experienceCategoryId && (
                        <div className="text-danger mt-1" style={{ fontSize: '0.875em' }}>
                          {errors.experienceCategoryId}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="col-lg-3 col-md-6 col-sm-12">
                    <div className="mb-3">
                      <label htmlFor="experience_subcategory_name" className="form-label">Experience Subcategory Name <span className='required-field'>*</span></label>
                      <input
                        type="text"
                        name="experienceSubcategoryName"
                        value={formData.experienceSubcategoryName}
                        onChange={handleInputChange}
                        className={`form-control ${errors.experienceSubcategoryName ? 'is-invalid' : ''}`}
                        placeholder='Enter Experience Subcategory Name'
                      />
                      {errors.experienceSubcategoryName && <div className="invalid-feedback">{errors.experienceSubcategoryName}</div>}
                    </div>
                  </div>
                  <div className="col-lg-3 col-md-6 col-sm-12">
                    <div className="mb-3">
                      <label htmlFor="experience_subcategory_url" className="form-label">Experience Subcategory URL <span className='required-field'>*</span></label>
                      <input
                        type="text"
                        name="experienceSubcategoryUrl"
                        value={formData.experienceSubcategoryUrl}
                        onChange={handleInputChange}
                        className={`form-control ${errors.experienceSubcategoryUrl ? 'is-invalid' : ''}`}
                        placeholder='Enter Experience Subcategory URL'
                      />
                      {errors.experienceSubcategoryUrl && <div className="invalid-feedback">{errors.experienceSubcategoryUrl}</div>}
                    </div>
                  </div>
                  <div className="col-lg-3 col-md-6 col-sm-12">
                    <div className="mb-3">
                      <label htmlFor="display_order" className="form-label">Display Order <span className='required-field'>*</span></label>
                      <input
                        type="number"
                        name="displayOrder"
                        value={formData.displayOrder}
                        onChange={handleInputChange}
                        className={`form-control ${errors.displayOrder ? 'is-invalid' : ''}`}
                        placeholder='Enter Display Order'
                        min="0"
                      />
                      {errors.displayOrder && <div className="invalid-feedback">{errors.displayOrder}</div>}
                    </div>
                  </div>
                  <div className="col-lg-3 col-md-6 col-sm-12">
                    <div className="mb-3">
                      <label htmlFor="experience_subcategory_image" className="form-label">Experience Subcategory Image</label>
                      <input
                        type="file"
                        name="experienceSubcategoryImage"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="form-control"
                      />
                      {imagePreview && (
                        <img
                          src={imagePreview}
                          alt="Experience subcategory preview"
                          className="mt-2"
                          style={{ maxHeight: '80px', maxWidth: '100%', objectFit: 'contain' }}
                        />
                      )}
                    </div>
                  </div>
                  <div className="col-lg-6 col-md-12">
                    <div className="mb-3">
                      <label htmlFor="experience_subcategory_short_desc" className="form-label">Short Description</label>
                      <textarea
                        name="experienceSubcategoryShortDesc"
                        value={formData.experienceSubcategoryShortDesc}
                        onChange={handleInputChange}
                        className="form-control"
                        placeholder='Enter a short description'
                        rows={2}
                      />
                    </div>
                  </div>
                  <div className="col-lg-12">
                    <div>
                      <button type="submit" className="btn btn-secondary pt-1 pb-1 p-3" disabled={isButtonDisabled}>{isButtonDisabled ? (editMode ? 'Updating' : 'Saving') : (editMode ? 'Update' : 'Save')}</button>
                      {editMode && (
                        <button type="button" onClick={handleAddNewClick} className="btn btn-danger ms-1 pt-1 pb-1 p-3">
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                {apiError && <div className="alert alert-danger">{apiError}</div>}
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
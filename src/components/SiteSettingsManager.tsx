import React, { useState } from 'react';
import { Home, Plus, Trash2, ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { useSiteSettings } from '../hooks/useSiteSettings';
import { useImageUpload } from '../hooks/useImageUpload';
import { IMAGEKIT_FOLDERS } from '../lib/imagekitFolders';

const SiteSettingsManager: React.FC = () => {
  const { siteSettings, loading, updateSiteSettings } = useSiteSettings();
  const { uploadImage } = useImageUpload(IMAGEKIT_FOLDERS.logo);
  const { uploadImage: uploadHeroImage, uploading: uploadingHero } = useImageUpload(IMAGEKIT_FOLDERS.hero);

  const [formData, setFormData] = useState({
    site_name: '',
    site_description: '',
    currency: '',
    currency_code: '',
    // Hero Fields
    hero_badge_text: '',
    hero_title_prefix: '',
    hero_title_highlight: '',
    hero_title_suffix: '',
    hero_subtext: '',
    hero_tagline: '',
    hero_description: '',
    hero_accent_color: 'gold-500'
  });

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [heroImages, setHeroImages] = useState<string[]>([]);
  const [showAssessmentSlide, setShowAssessmentSlide] = useState(true);
  const [assessmentPosition, setAssessmentPosition] = useState<'first' | 'last'>('last');
  const [isSaving, setIsSaving] = useState(false);

  React.useEffect(() => {
    if (siteSettings) {
      setFormData({
        site_name: siteSettings.site_name,
        site_description: siteSettings.site_description,
        currency: siteSettings.currency,
        currency_code: siteSettings.currency_code,
        hero_badge_text: siteSettings.hero_badge_text || '',
        hero_title_prefix: siteSettings.hero_title_prefix || '',
        hero_title_highlight: siteSettings.hero_title_highlight || '',
        hero_title_suffix: siteSettings.hero_title_suffix || '',
        hero_subtext: siteSettings.hero_subtext || '',
        hero_tagline: siteSettings.hero_tagline || '',
        hero_description: siteSettings.hero_description || '',
        hero_accent_color: siteSettings.hero_accent_color || 'gold-500'
      });
      setLogoPreview(siteSettings.site_logo);
      setHeroImages(siteSettings.hero_images && siteSettings.hero_images.length > 0
        ? siteSettings.hero_images
        : [siteSettings.hero_image_url || '/hero-plp-slim.jpg']);
      setShowAssessmentSlide(siteSettings.hero_show_assessment_slide !== false);
      setAssessmentPosition(siteSettings.hero_assessment_slide_position === 'first' ? 'first' : 'last');
    }
  }, [siteSettings]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddHeroImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const uploadedUrl = await uploadHeroImage(file);
      setHeroImages(prev => [...prev, uploadedUrl]);
    } catch (error) {
      console.error('Error uploading hero image:', error);
      alert('Failed to upload image.');
    } finally {
      // Allow re-selecting the same file later.
      e.target.value = '';
    }
  };

  const handleRemoveHeroImage = (index: number) => {
    setHeroImages(prev => prev.filter((_, i) => i !== index));
  };

  // Make an image the primary (first) slide, and ensure the assessment slide
  // gives up the primary position so this image really shows first.
  const handleMakePrimaryImage = (index: number) => {
    setHeroImages(prev => {
      if (index <= 0 || index >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(index, 1);
      next.unshift(moved);
      return next;
    });
    setAssessmentPosition('last');
  };

  const handleMoveHeroImage = (index: number, direction: -1 | 1) => {
    setHeroImages(prev => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      let logoUrl = logoPreview;

      if (logoFile) {
        // useImageUpload uses the folder defined at hook level (default 'menu-images')
        const uploadedUrl = await uploadImage(logoFile);
        logoUrl = uploadedUrl;
      }

      const carouselImages = heroImages.filter(Boolean);

      await updateSiteSettings({
        ...formData,
        site_logo: logoUrl,
        hero_images: carouselImages,
        // Keep the legacy single field in sync for backward compatibility.
        hero_image_url: carouselImages[0] || '/hero-plp-slim.jpg',
        hero_show_assessment_slide: showAssessmentSlide,
        hero_assessment_slide_position: assessmentPosition
      });

      setLogoFile(null);
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving site settings:', error);
      alert('Failed to save settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefaults = () => {
    if (confirm('Are you sure you want to reset the homepage content to defaults?')) {
      setFormData(prev => ({
        ...prev,
        hero_badge_text: 'Premium Peptide Solutions',
        hero_title_prefix: 'Premium',
        hero_title_highlight: 'Peptides',
        hero_title_suffix: '& Essentials',
        hero_subtext: 'From the Lab to You — Simplifying Science, One Dose at a Time.',
        hero_tagline: 'Quality-tested products. Reliable performance. Trusted by our community.',
        hero_description: 'RSPEPTIDE provides research-grade peptides engineered for precision, purity, and consistency.',
      }));
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading settings...</div>;
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Homepage Content Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-orange-50 rounded-lg">
              <Home className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Homepage Content</h2>
              <p className="text-sm text-gray-500 mt-1">Customize the landing page text.</p>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving || uploadingHero}
            className="bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium px-6 py-2.5 rounded-lg transition-colors disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Hero Carousel Images */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Hero Carousel Images</label>
            <p className="text-xs text-gray-500 mb-3">
              The banner images at the top of the homepage. Add multiple images to create an auto-rotating carousel. Use the arrows to reorder — the first image shows first.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {heroImages.map((url, index) => (
                <div key={`${url}-${index}`} className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50 relative group">
                  <div className={`absolute top-2 left-2 z-10 text-white text-xs font-medium px-2 py-0.5 rounded ${
                    index === 0 && !(showAssessmentSlide && assessmentPosition === 'first') ? 'bg-gold-600' : 'bg-black/60'
                  }`}>
                    {index === 0 && !(showAssessmentSlide && assessmentPosition === 'first')
                      ? 'Primary'
                      : `#${index + 1 + (showAssessmentSlide && assessmentPosition === 'first' ? 1 : 0)}`}
                  </div>
                  <img src={url} alt={`Hero slide ${index + 1}`} className="w-full h-36 object-contain bg-white" />
                  <div className="flex items-center justify-between gap-1 p-2 bg-white border-t border-gray-100">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleMakePrimaryImage(index)}
                        disabled={index === 0 && !(showAssessmentSlide && assessmentPosition === 'first')}
                        className="p-1.5 rounded-md hover:bg-gold-50 text-gold-600 disabled:opacity-30 disabled:hover:bg-transparent"
                        aria-label="Make this the primary (first) slide"
                        title="Make primary"
                      >
                        <Star className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveHeroImage(index, -1)}
                        disabled={index === 0}
                        className="p-1.5 rounded-md hover:bg-gray-100 text-gray-600 disabled:opacity-30 disabled:hover:bg-transparent"
                        aria-label="Move left"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveHeroImage(index, 1)}
                        disabled={index === heroImages.length - 1}
                        className="p-1.5 rounded-md hover:bg-gray-100 text-gray-600 disabled:opacity-30 disabled:hover:bg-transparent"
                        aria-label="Move right"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveHeroImage(index)}
                      className="flex items-center gap-1 text-red-500 hover:text-red-700 text-sm font-medium px-2 py-1 rounded-md hover:bg-red-50"
                      aria-label="Remove image"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              {/* Add new image tile */}
              <label className="cursor-pointer border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-2 text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors min-h-[180px]">
                {uploadingHero ? (
                  <span className="text-sm font-medium">Uploading...</span>
                ) : (
                  <>
                    <Plus className="w-7 h-7" />
                    <span className="text-sm font-medium">Add Image</span>
                  </>
                )}
                <input type="file" accept="image/*" onChange={handleAddHeroImage} className="hidden" disabled={uploadingHero} />
              </label>
            </div>

            {heroImages.length === 0 && (
              <p className="text-xs text-amber-600 mt-3">No images added — the homepage will use the default hero image.</p>
            )}

            {/* Peptide Assessment slide toggle + position */}
            <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showAssessmentSlide}
                  onChange={(e) => setShowAssessmentSlide(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-navy-900"
                />
                <span>
                  <span className="block text-sm font-medium text-gray-800">Show Peptide Assessment slide</span>
                  <span className="block text-xs text-gray-500 mt-0.5">
                    Adds an “Which peptide protocol is right for you?” slide (linking to /assessment) to the
                    hero carousel. This slide is built-in — it is not an uploaded image.
                  </span>
                </span>
              </label>

              {showAssessmentSlide && (
                <div className="mt-3 pl-7">
                  <span className="block text-xs font-medium text-gray-700 mb-1.5">Assessment slide position</span>
                  <div className="flex gap-2">
                    {(['first', 'last'] as const).map((pos) => (
                      <button
                        key={pos}
                        type="button"
                        onClick={() => setAssessmentPosition(pos)}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                          assessmentPosition === pos
                            ? 'border-navy-900 bg-navy-900 text-white'
                            : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
                        }`}
                      >
                        {pos === 'first' ? 'First (primary)' : 'Last'}
                      </button>
                    ))}
                  </div>
                  {assessmentPosition === 'first' && (
                    <p className="text-xs text-gold-700 mt-2">The assessment slide is the primary slide — it shows first.</p>
                  )}
                </div>
              )}
            </div>

            <p className="text-xs text-gray-400 mt-3">Remember to click “Save Changes” to apply.</p>
          </div>

          {/* Badge Text */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Badge Text</label>
            <input
              type="text"
              name="hero_badge_text"
              value={formData.hero_badge_text}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
              placeholder="e.g. Premium Peptide Solutions"
            />
          </div>

          {/* Title Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Title Prefix</label>
              <input
                type="text"
                name="hero_title_prefix"
                value={formData.hero_title_prefix}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-gray-900 transition-all"
                placeholder="e.g. Premium"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Highlight (Color)</label>
              <input
                type="text"
                name="hero_title_highlight"
                value={formData.hero_title_highlight}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-theme-secondary font-medium focus:ring-2 focus:ring-gray-900 transition-all"
                placeholder="e.g. Peptides"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Title Suffix</label>
              <input
                type="text"
                name="hero_title_suffix"
                value={formData.hero_title_suffix}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-gray-900 transition-all"
                placeholder="e.g. & Essentials"
              />
            </div>
          </div>

          {/* Subtext */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Subtext (Next to Title)</label>
            <input
              type="text"
              name="hero_subtext"
              value={formData.hero_subtext}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-gray-900 transition-all"
              placeholder="e.g. — Trusted Quality for Your Journey."
            />
          </div>

          {/* Hero Tagline */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Hero Tagline</label>
            <textarea
              name="hero_tagline"
              value={formData.hero_tagline}
              onChange={handleInputChange}
              rows={2}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-gray-900 transition-all resize-none"
              placeholder="e.g. Quality-tested products. Reliable performance..."
            />
          </div>

          {/* Main Description */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Main Description</label>
            <textarea
              name="hero_description"
              value={formData.hero_description}
              onChange={handleInputChange}
              rows={4}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-gray-900 transition-all resize-none"
              placeholder="e.g. Explore our carefully curated selection..."
            />
          </div>

          {/* Reset Link */}
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="text-sm text-red-500 hover:text-red-700 font-medium underline underline-offset-2 transition-colors"
            >
              Reset Homepage Defaults
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SiteSettingsManager;

import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import { Canvas, Rect, Image, Textbox, Text, util } from 'fabric';
import { ChevronLeft, ChevronRight, Play, Download, Palette } from 'lucide-react';

const AVAILABLE_TEMPLATES = [
  { id: "hero_headline_feed", name: "Hero Headline", format: "feed_post" },
  { id: "quote_card_feed", name: "Quote Card", format: "feed_post" },
  { id: "split_layout_feed", name: "Split Layout", format: "feed_post" },
  { id: "product_showcase_feed", name: "Product Showcase", format: "feed_post" },
  { id: "minimal_text_feed", name: "Minimal Text", format: "feed_post" },
  { id: "carousel_list_005", name: "List Carousel (5 slides)", format: "carousel" },
  { id: "carousel_story_006", name: "Story Carousel (6 slides)", format: "carousel" },
  { id: "carousel_comparison_004", name: "Comparison Carousel (4 slides)", format: "carousel" },
  { id: "carousel_faq_005", name: "FAQ Carousel (5 slides)", format: "carousel" },
  { id: "carousel_data_008", name: "Data Carousel (8 slides)", format: "carousel" },
  { id: "story_fullscreen", name: "Fullscreen Story", format: "story" },
  { id: "story_split", name: "Split Story", format: "story" },
  { id: "story_quote", name: "Quote Story", format: "story" },
  { id: "reel_fullscreen", name: "Fullscreen Reel", format: "reel" },
  { id: "reel_split", name: "Split Reel", format: "reel" }
];

const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

const resolveValue = (raw, bindings) => {
  if (!bindings) return raw;
  if (typeof raw === 'string' && raw.startsWith('brand.')) {
    const key = raw.slice('brand.'.length);
    return bindings[key] ?? raw;
  }
  return raw;
};

const TemplateCanvas = forwardRef(({
  brandId,
  templateSchema,
  slotData = {},
  brandVariables = {},
  dimensions = { width: 1080, height: 1080 },
  className = "",
  onSlotEdit,              // (slot_id, updatedFields)
  onTemplateSwitch,        // (newTemplateId, newSlotData, newTemplateSchema)
  onSlotMediaClick         // (slot_id) - trigger media suggestions
}, ref) => {
  const canvasRef = useRef(null);
  const fabricCanvasRef = useRef(null);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [activeColorPickerSlot, setActiveColorPickerSlot] = useState(null); // { slotId, color }
  const [bindings, setBindings] = useState(null);

  // Fetch brand bindings from customer API endpoint
  useEffect(() => {
    if (!brandId) return;
    const token = localStorage.getItem("mpp_token");
    fetch(`${API_BASE}/api/customer/brands/${brandId}/bindings`, {
      headers: { Authorization: token ? `Bearer ${token}` : "" }
    })
      .then(res => {
        if (!res.ok) throw new Error("Bindings fetch failed");
        return res.json();
      })
      .then(data => setBindings(data))
      .catch(err => console.warn("[TEMPLATE CANVAS] Bindings fetch error:", err));
  }, [brandId]);

  const slides = templateSchema?.slides || [];
  const activeSlide = slides[activeSlideIndex];

  // Colors & fonts overrides from bindings/props
  const primaryColor = bindings?.primary_color || brandVariables?.primary_color || "#1A1A1A";
  const secondaryColor = bindings?.secondary_color || brandVariables?.secondary_color || "#F5F5F5";
  const fontStack = bindings?.body_font || brandVariables?.font_stack || "Inter, sans-serif";
  const logoUrl = bindings?.logo_url || brandVariables?.logo_url || "";

  // Normalize slot layout list for V1/V2 template support
  const isV2 = templateSchema && Array.isArray(templateSchema.slots);
  const slotsList = isV2 
    ? templateSchema.slots 
    : (activeSlide?.components || []).map((comp, idx) => ({
        slot_id: comp.id || `slot_${idx}`,
        type: comp.type,
        content_key: comp.type === 'headline' ? 'headline' : comp.type === 'body' ? 'body' : comp.type === 'cta_button' ? 'cta' : 'text',
        x: comp.position?.x !== undefined ? `${comp.position.x}%` : '0%',
        y: comp.position?.y !== undefined ? `${comp.position.y}%` : '0%',
        width: comp.position?.width !== undefined ? `${comp.position.width}%` : '100%',
        height: comp.position?.height !== undefined ? `${comp.position.height}%` : '100%',
        z_index: comp.position?.z_index || 0,
        font: comp.font || 'brand.body_font',
        size: comp.size,
        color: comp.color || 'brand.contrast_on_light',
        fill: comp.fill || 'brand.primary_color',
        source: comp.source || 'brand.logo_url',
        text: comp.text,
        max_chars: comp.max_chars
      }));

  // Initialize and dispose Fabric Canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.dispose();
    }

    const scaleFactor = Math.min(
      (window.innerWidth * 0.4) / dimensions.width,
      (window.innerHeight * 0.6) / dimensions.height,
      1
    );

    const fCanvas = new Canvas(canvasRef.current, {
      width: dimensions.width,
      height: dimensions.height,
      backgroundColor: resolveValue(secondaryColor, bindings),
      preserveObjectStacking: true,
      selection: false
    });

    const canvasEl = fCanvas.getElement();
    canvasEl.style.width = `${dimensions.width * scaleFactor}px`;
    canvasEl.style.height = `${dimensions.height * scaleFactor}px`;
    canvasEl.style.maxHeight = '70vh';
    canvasEl.style.objectFit = 'contain';

    fabricCanvasRef.current = fCanvas;

    // Register click/change event handlers for interactive slot editing
    fCanvas.on('mouse:down', (opt) => {
      const target = opt.target;
      if (!target) return;

      const slotId = target.slotId;
      if (!slotId) return;

      if (target.componentType === 'image') {
        if (onSlotMediaClick) onSlotMediaClick(slotId);
      } else if (target.componentType === 'background') {
        setActiveColorPickerSlot({ slotId, color: target.fill });
      }
    });

    fCanvas.on('text:changed', (opt) => {
      const target = opt.target;
      if (target && target.slotId && onSlotEdit) {
        onSlotEdit(target.slotId, { text: target.text });
      }
    });

    return () => {
      fCanvas.dispose();
      fabricCanvasRef.current = null;
    };
  }, [dimensions, secondaryColor, onSlotEdit, onSlotMediaClick, bindings]);

  // Redraw Canvas when props or active slide changes
  useEffect(() => {
    const fCanvas = fabricCanvasRef.current;
    if (!fCanvas) return;

    fCanvas.clear();
    const bgFill = resolveValue(secondaryColor, bindings);
    fCanvas.backgroundColor = bgFill;
    fCanvas.requestRenderAll();

    const drawSlide = async () => {
      const canvasWidth = dimensions.width;
      const canvasHeight = dimensions.height;

      const activeSlotId = activeSlide?.slot_id || "slide_1";
      const currentSlotData = slotData[activeSlotId] || {};

      // 1. Draw Background Rect first
      const rectFill = resolveValue(currentSlotData.palette?.background || secondaryColor, bindings);
      fCanvas.backgroundColor = rectFill;
      fCanvas.requestRenderAll();

      const bgRect = new Rect({
        left: 0,
        top: 0,
        width: canvasWidth,
        height: canvasHeight,
        fill: rectFill,
        selectable: true,
        hasControls: false,
        hasBorders: false,
        lockMovementX: true,
        lockMovementY: true,
        hoverCursor: 'pointer'
      });
      bgRect.slotId = activeSlotId;
      bgRect.componentType = 'background';
      fCanvas.add(bgRect);

      // 2. Draw sorted elements sequentially
      const sortedSlots = [...slotsList].sort((a, b) => (a.z_index || 0) - (b.z_index || 0));

      for (const slot of sortedSlots) {
        const leftPct = parseFloat(slot.x) || 0;
        const topPct = parseFloat(slot.y) || 0;
        const wPct = parseFloat(slot.width) || 100;
        const hPct = parseFloat(slot.height) || 100;

        const left = (leftPct / 100) * canvasWidth;
        const top = (topPct / 100) * canvasHeight;
        const w = (wPct / 100) * canvasWidth;
        const h = (hPct / 100) * canvasHeight;

        if (slot.type === 'image') {
          const rawUrl = currentSlotData[slot.content_key] || currentSlotData.image_url || slot.text || "https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=640&q=80";
          const imgUrl = resolveValue(rawUrl, bindings);
          await new Promise((resolve) => {
            Image.fromURL(imgUrl, (fImg) => {
              if (!fImg) return resolve();
              
              fImg.set({
                left,
                top,
                originX: 'left',
                originY: 'top',
                selectable: true,
                hasControls: false,
                hasBorders: true,
                lockMovementX: true,
                lockMovementY: true,
                hoverCursor: 'pointer'
              });
              fImg.slotId = activeSlotId;
              fImg.componentType = 'image';

              const scaleX = w / fImg.width;
              const scaleY = h / fImg.height;
              const scale = Math.max(scaleX, scaleY);
              fImg.scale(scale);

              const clipPath = new Rect({
                left,
                top,
                width: w,
                height: h,
                absolutePositioned: true
              });
              fImg.clipPath = clipPath;

              fCanvas.add(fImg);
              resolve();
            }, { crossOrigin: 'anonymous' });
          });
        } 
        else if (slot.type === 'shape') {
          const fill = resolveValue(slot.fill || 'brand.secondary_color', bindings);
          const rect = new Rect({
            left,
            top,
            width: w,
            height: h,
            fill,
            opacity: slot.opacity ?? 1,
            rx: slot.radius || 0,
            ry: slot.radius || 0,
            selectable: false
          });
          fCanvas.add(rect);
        }
        else if (['headline', 'body', 'subtitle', 'text'].includes(slot.type)) {
          const textVal = (slot.content_key === 'headline' ? currentSlotData.headline :
                           slot.content_key === 'body' ? currentSlotData.body :
                           slot.content_key === 'cta' ? currentSlotData.cta : null) ||
                           currentSlotData[slot.content_key] ||
                           currentSlotData.text ||
                           slot.text || 'Standard copy block';
          
          const fill = resolveValue(slot.color || 'brand.contrast_on_light', bindings);
          const font = resolveValue(slot.font || 'brand.body_font', bindings);
          
          const maxChars = slot.max_chars || 100;
          const baseSize = slot.size || (slot.content_key === 'headline' ? Math.round(canvasHeight * 0.05) : Math.round(canvasHeight * 0.03));
          const scaledSize = textVal.length > maxChars ? Math.round(baseSize * (maxChars / textVal.length)) : baseSize;

          const textBox = new Textbox(textVal, {
            left,
            top,
            width: w,
            fontSize: Math.max(scaledSize, 16),
            fontFamily: font,
            fill,
            fontWeight: slot.weight || 'normal',
            textAlign: slot.align || 'left',
            splitByGrapheme: true,
            originX: 'left',
            originY: 'top',
            editable: true,
            hasControls: false,
            hasBorders: true,
            lockMovementX: true,
            lockMovementY: true
          });
          textBox.slotId = activeSlotId;
          textBox.componentType = 'text';

          fCanvas.add(textBox);
        }
        else if (slot.type === 'logo') {
          const src = resolveValue(slot.source || 'brand.logo_url', bindings);
          if (src) {
            await new Promise((resolve) => {
              Image.fromURL(src, (fLogo) => {
                if (!fLogo) return resolve();
                
                fLogo.set({
                  left,
                  top,
                  originX: 'left',
                  originY: 'top',
                  selectable: false
                });

                const scaleX = w / fLogo.width;
                const scaleY = h / fLogo.height;
                const scale = Math.min(scaleX, scaleY);
                fLogo.scale(scale);

                fCanvas.add(fLogo);
                resolve();
              }, { crossOrigin: 'anonymous' });
            });
          }
        }
        else if (slot.type === 'cta_button') {
          const btnText = resolveValue(currentSlotData[slot.content_key] || currentSlotData.cta || slot.text || "Learn More", bindings);
          const btnBgColor = resolveValue(slot.fill || 'brand.accent_color', bindings);
          const btnTextColor = resolveValue(slot.text_color || 'brand.contrast_on_accent', bindings);
          const font = resolveValue(slot.font || 'brand.body_font', bindings);

          const bgRectObj = new Rect({
            left,
            top,
            width: w,
            height: h,
            fill: btnBgColor,
            rx: slot.radius || 8,
            ry: slot.radius || 8,
            originX: 'left',
            originY: 'top',
            selectable: false
          });

          const label = new Text(btnText, {
            left: left + w / 2,
            top: top + h / 2,
            fontSize: Math.round(h * 0.4),
            fontFamily: font,
            fill: btnTextColor,
            fontWeight: 'bold',
            originX: 'center',
            originY: 'center',
            selectable: false
          });

          fCanvas.add(bgRectObj);
          fCanvas.add(label);
        }
      }

      const preset = templateSchema?.animation_preset || "fade_slide";
      if (preset === "slide_up" || preset === "fade_slide") {
        fCanvas.getObjects().forEach((obj) => {
          if (obj.componentType === 'text' || obj.componentType === 'image') {
            const originalTop = obj.top;
            obj.set({ top: originalTop + 40, opacity: 0 });
            obj.animate('top', originalTop, {
              duration: 500,
              onChange: fCanvas.renderAll.bind(fCanvas),
              easing: util.ease.easeOutExpo
            });
            obj.animate('opacity', 1, {
              duration: 400,
              onChange: fCanvas.renderAll.bind(fCanvas)
            });
          }
        });
      }

      fCanvas.renderAll();
    };

    drawSlide();
  }, [activeSlideIndex, templateSchema, slotsList, slotData, dimensions, secondaryColor, primaryColor, fontStack, logoUrl, bindings]);

  // Handle template selection and re-mapping text to new slots
  const handleTemplateSelect = async (newTemplateId) => {
    if (!onTemplateSwitch) return;

    try {
      const token = localStorage.getItem("mpp_token");
      const res = await fetch(`${API_BASE}/api/customer/templates/${newTemplateId}`, {
        headers: { Authorization: token ? `Bearer ${token}` : "" }
      });
      if (!res.ok) throw new Error("Template fetch failed");
      const newSchema = await res.json();

      // Gather current text & image sequences to map them
      const currentTexts = [];
      const currentImages = [];
      Object.keys(slotData).forEach(id => {
        if (slotData[id].text) currentTexts.push(slotData[id].text);
        if (slotData[id].image_url) currentImages.push(slotData[id].image_url);
      });

      const newSlotData = {};
      let textIdx = 0;
      let imgIdx = 0;

      newSchema.slides.forEach((slide) => {
        let matchedText = "";
        if (slide.slot_type === "cta") {
          matchedText = currentTexts.find(t => t.toLowerCase().includes("learn") || t.toLowerCase().includes("visit") || t.toLowerCase().includes("join") || t.toLowerCase().includes("click")) || currentTexts[currentTexts.length - 1] || "Learn More";
        } else {
          matchedText = currentTexts[textIdx++] || "Strategic headline or caption";
        }

        const matchedImage = currentImages[imgIdx++] || currentImages[0] || "";

        newSlotData[slide.slot_id] = {
          text: matchedText,
          image_url: matchedImage,
          palette: {
            dominant: primaryColor,
            accent: secondaryColor,
            background: "#F5F5F5",
            text_contrast: "#FFFFFF"
          }
        };
      });

      setActiveSlideIndex(0);
      onTemplateSwitch(newTemplateId, newSlotData, newSchema);
    } catch (e) {
      console.error("[TEMPLATE CANVAS] Switch layout failed", e);
    }
  };

  useImperativeHandle(ref, () => ({
    renderToPNG: () => {
      const fCanvas = fabricCanvasRef.current;
      if (!fCanvas) return null;
      return fCanvas.toDataURL({
        format: 'png',
        quality: 1.0
      });
    },
    renderToMP4: async (durationMs = 3000) => {
      const fCanvas = fabricCanvasRef.current;
      if (!fCanvas) return null;

      setIsRecording(true);
      const canvasEl = fCanvas.getElement();
      const stream = canvasEl.captureStream(30);
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9'
      });
      const chunks = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      return new Promise((resolve) => {
        mediaRecorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'video/webm' });
          setIsRecording(false);
          resolve(blob);
        };

        mediaRecorder.start();
        setTimeout(() => {
          mediaRecorder.stop();
        }, durationMs);
      });
    }
  }));

  const getContrastColor = (hex) => {
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    const fullHex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
    if (!result) return "#000000";
    
    const r = parseInt(result[1], 16) / 255;
    const g = parseInt(result[2], 16) / 255;
    const b = parseInt(result[3], 16) / 255;
    
    const aR = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
    const aG = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
    const aB = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);
    
    const luminance = 0.2126 * aR + 0.7152 * aG + 0.0722 * aB;
    return luminance > 0.179 ? "#000000" : "#FFFFFF";
  };

  const handlePrev = () => {
    setActiveSlideIndex(prev => (prev === 0 ? slides.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setActiveSlideIndex(prev => (prev === slides.length - 1 ? 0 : prev + 1));
  };

  const currentFormat = templateSchema?.format || "feed_post";
  const alternativeTemplates = AVAILABLE_TEMPLATES.filter(t => t.format === currentFormat);

  return (
    <div className={`flex flex-col items-center select-none bg-slate-900/40 p-6 rounded-2xl border border-slate-700/50 backdrop-blur-xl relative ${className}`}>
      {/* Canvas Mount Bounding Box */}
      <div className="relative shadow-2xl rounded-lg overflow-hidden bg-slate-950/20 border border-slate-800/80">
        <canvas ref={canvasRef} className="block shadow-xl" />

        {/* Carousel Navigation Arrow Overlays */}
        {slides.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-slate-950/60 hover:bg-slate-900 border border-slate-700/50 text-white cursor-pointer transition shadow-lg backdrop-blur-sm"
              aria-label="Previous Slide"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={handleNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-slate-950/60 hover:bg-slate-900 border border-slate-700/50 text-white cursor-pointer transition shadow-lg backdrop-blur-sm"
              aria-label="Next Slide"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

        {/* Recording / Processing Overlay */}
        {isRecording && (
          <div className="absolute inset-0 bg-slate-950/75 flex flex-col items-center justify-center text-white backdrop-blur-sm">
            <Play className="w-12 h-12 text-rose-500 animate-pulse mb-3" />
            <span className="text-sm font-semibold tracking-wider">RECORDING SLIDE ANIMATION...</span>
          </div>
        )}
      </div>

      {/* Slide Navigation Pagination Indicators */}
      {slides.length > 1 && (
        <div className="flex items-center gap-2 mt-4">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setActiveSlideIndex(idx)}
              className={`w-2.5 h-2.5 rounded-full transition cursor-pointer ${
                idx === activeSlideIndex 
                  ? 'bg-rose-500 scale-125' 
                  : 'bg-slate-600 hover:bg-slate-400'
              }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      )}

      {/* Floating Color Picker Overlay */}
      {activeColorPickerSlot && (
        <div className="absolute top-16 z-50 bg-slate-900 border border-slate-700 p-4 rounded-xl shadow-2xl flex flex-col gap-2">
          <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5"><Palette className="w-3.5 h-3.5" /> Background Color</span>
          <div className="flex gap-2 items-center">
            <input 
              type="color" 
              value={activeColorPickerSlot.color || "#FFFFFF"} 
              onChange={(e) => {
                const color = e.target.value;
                setActiveColorPickerSlot(prev => ({ ...prev, color }));
                if (onSlotEdit) {
                  onSlotEdit(activeColorPickerSlot.slotId, { 
                    palette: { ...slotData[activeColorPickerSlot.slotId]?.palette, background: color } 
                  });
                }
              }}
              className="w-10 h-10 border-0 rounded cursor-pointer"
            />
            <input
              type="text"
              value={activeColorPickerSlot.color}
              onChange={(e) => {
                const color = e.target.value;
                setActiveColorPickerSlot(prev => ({ ...prev, color }));
                if (onSlotEdit) {
                  onSlotEdit(activeColorPickerSlot.slotId, { 
                    palette: { ...slotData[activeColorPickerSlot.slotId]?.palette, background: color } 
                  });
                }
              }}
              className="bg-slate-950 text-xs text-slate-200 border border-slate-800 rounded p-1.5 w-24"
            />
          </div>
          <button 
            onClick={() => setActiveColorPickerSlot(null)}
            className="text-xs bg-rose-500 hover:bg-rose-600 py-1.5 rounded font-semibold text-white transition cursor-pointer"
          >
            Close
          </button>
        </div>
      )}

      {/* Alternative Template Layouts Gallery */}
      {alternativeTemplates.length > 1 && (
        <div className="w-full mt-6 border-t border-slate-800/80 pt-4">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Alternative Layouts</h4>
          <div className="flex gap-2 overflow-x-auto pb-1 max-w-full">
            {alternativeTemplates.map(tpl => (
              <button
                key={tpl.id}
                onClick={() => handleTemplateSelect(tpl.id)}
                className={`flex-shrink-0 px-3.5 py-2 rounded-lg border text-xs font-semibold transition cursor-pointer ${
                  tpl.id === templateSchema?.template_id
                    ? 'bg-rose-500 text-white border-rose-500'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
                }`}
              >
                {tpl.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

TemplateCanvas.displayName = 'TemplateCanvas';

export default TemplateCanvas;

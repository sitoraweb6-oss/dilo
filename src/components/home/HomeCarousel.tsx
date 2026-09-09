import React, { useEffect, useState, useCallback } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { db } from '../../lib/firebase';
import { collection, query, where, orderBy, onSnapshot, getDocs } from 'firebase/firestore';
import { CarouselImage } from '../../types';
import { ChevronLeft, ChevronRight, X, ZoomIn, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function HomeCarousel() {
  const [images, setImages] = useState<CarouselImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, duration: 30 });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<CarouselImage | null>(null);

  useEffect(() => {
    let isMounted = true;
    const q = query(
      collection(db, 'photoCarousel'),
      where('isActive', '==', true),
      orderBy('displayOrder', 'asc')
    );
    getDocs(q).then((snap) => {
      if (isMounted) {
        setImages(snap.docs.map(d => ({ id: d.id, ...d.data() } as CarouselImage)));
        setLoading(false);
      }
    }).catch((e) => {
      console.error(e);
      if (isMounted) setLoading(false);
    });
    return () => { isMounted = false; };
  }, []);

  const scrollTo = useCallback((index: number) => emblaApi && emblaApi.scrollTo(index), [emblaApi]);
  const scrollPrev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi, setSelectedIndex]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
  }, [emblaApi, onSelect]);

  useEffect(() => {
    if (!emblaApi || isHovered || images.length <= 1) return;
    const autoplay = setInterval(() => {
      emblaApi.scrollNext();
    }, 5000);
    return () => clearInterval(autoplay);
  }, [emblaApi, isHovered, images.length]);

  if (loading) return null;

  if (images.length === 0) {
    return (
      <div className="w-full rounded-[18px] border border-slate-100 bg-white p-8 shadow-sm flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-3">
          <ImageIcon className="w-8 h-8 text-slate-300" />
        </div>
        <h3 className="text-sm font-bold text-slate-700">কোনো ছবি এখনো যোগ করা হয়নি</h3>
      </div>
    );
  }

  return (
    <>
      <div 
        className="relative w-full rounded-[18px] overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.08)] bg-slate-900 group"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onTouchStart={() => setIsHovered(true)}
        onTouchEnd={() => { setTimeout(() => setIsHovered(false), 2000) }}
      >
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex touch-pan-y">
            {images.map((img, index) => (
              <div key={img.id} className="relative flex-[0_0_100%] min-w-0 aspect-[16/10] sm:aspect-[21/9]">
                <img 
                  src={img.imageUrl} 
                  alt={img.title || 'Carousel image'} 
                  className="w-full h-full object-cover"
                  loading={index === 0 ? "eager" : "lazy"}
                  onClick={() => setFullscreenImage(img)}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
                
                <div className="absolute bottom-0 left-0 right-0 p-5 pb-8 sm:p-6 sm:pb-8 flex flex-col justify-end">
                  {img.title && (
                    <motion.h3 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: selectedIndex === index ? 1 : 0, y: selectedIndex === index ? 0 : 10 }}
                      transition={{ duration: 0.5, delay: 0.1 }}
                      className="text-white font-bold text-lg sm:text-xl drop-shadow-md mb-1"
                    >
                      {img.title}
                    </motion.h3>
                  )}
                  {img.caption && (
                    <motion.p 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: selectedIndex === index ? 1 : 0, y: selectedIndex === index ? 0 : 10 }}
                      transition={{ duration: 0.5, delay: 0.2 }}
                      className="text-white/90 text-xs sm:text-sm drop-shadow line-clamp-2 max-w-[85%]"
                    >
                      {img.caption}
                    </motion.p>
                  )}
                  {img.buttonText && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: selectedIndex === index ? 1 : 0, y: selectedIndex === index ? 0 : 10 }}
                      transition={{ duration: 0.5, delay: 0.3 }}
                      className="mt-3"
                    >
                      {img.buttonLink ? (
                        <a 
                          href={img.buttonLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block bg-white/20 hover:bg-white/30 backdrop-blur-md text-white border border-white/30 text-[10px] font-bold px-4 py-1.5 rounded-full transition-colors"
                        >
                          {img.buttonText}
                        </a>
                      ) : (
                        <button className="inline-block bg-white/20 hover:bg-white/30 backdrop-blur-md text-white border border-white/30 text-[10px] font-bold px-4 py-1.5 rounded-full transition-colors">
                          {img.buttonText}
                        </button>
                      )}
                    </motion.div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {images.length > 1 && (
          <>
            <button 
              onClick={scrollPrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 hover:bg-black/50 backdrop-blur-sm text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronLeft size={18} />
            </button>
            <button 
              onClick={scrollNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 hover:bg-black/50 backdrop-blur-sm text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronRight size={18} />
            </button>

            <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
              {images.map((_, index) => (
                <button
                  key={index}
                  onClick={() => scrollTo(index)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    index === selectedIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/50'
                  }`}
                />
              ))}
            </div>
          </>
        )}
        
        <button 
          onClick={() => setFullscreenImage(images[selectedIndex])}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/30 hover:bg-black/50 backdrop-blur-sm text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
        >
          <ZoomIn size={16} />
        </button>
      </div>

      <AnimatePresence>
        {fullscreenImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/95 flex flex-col"
          >
            <div className="flex justify-between items-center p-4">
              <span className="text-white/50 text-xs font-bold tracking-widest">
                {images.findIndex(img => img.id === fullscreenImage.id) + 1} / {images.length}
              </span>
              <button 
                onClick={() => setFullscreenImage(null)}
                className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
              <img 
                src={fullscreenImage.imageUrl} 
                alt={fullscreenImage.title} 
                className="max-w-full max-h-full object-contain select-none"
              />
            </div>
            
            <div className="p-6 bg-gradient-to-t from-black to-transparent text-center">
              {fullscreenImage.title && <h3 className="text-white font-bold text-lg mb-1">{fullscreenImage.title}</h3>}
              {fullscreenImage.caption && <p className="text-white/70 text-sm">{fullscreenImage.caption}</p>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

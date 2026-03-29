import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Helmet } from 'react-helmet-async';
import { Mail, MapPin, Clock, Send } from 'lucide-react';

export const Contact: React.FC = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    subject: '',
    message: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, you'd send this to an API or Supabase
    console.log('Form submitted:', formData);
    alert('Thank you for your message! We will get back to you soon.');
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      subject: '',
      message: ''
    });
  };

  return (
    <div className="space-y-24 pb-24">
      <Helmet>
        <title>Contact Us | The Chronicle</title>
        <meta name="description" content="Get in touch with The Chronicle. We'd love to hear from you." />
      </Helmet>

      {/* Hero Section */}
      <section className="bg-[#F2F0E9] py-24 text-center border-b border-border">
        <div className="max-w-4xl mx-auto px-4 space-y-6">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-6xl font-serif font-bold text-text tracking-tight"
          >
            Contact Us
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-text3 text-lg font-medium"
          >
            We'd love to hear from you.
          </motion.p>
        </div>
      </section>

      {/* Content Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
          {/* Left Column: Contact Info */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-12"
          >
            <h2 className="text-3xl font-serif font-bold text-text">Get in Touch</h2>
            
            <div className="space-y-8">
              <div className="flex items-start gap-6">
                <div className="w-12 h-12 bg-[#F2F0E9] rounded-lg flex items-center justify-center border border-border shrink-0">
                  <Mail className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-text uppercase tracking-widest mb-1">Email</h3>
                  <p className="text-text2">hello@thechronicle.com</p>
                </div>
              </div>

              <div className="flex items-start gap-6">
                <div className="w-12 h-12 bg-[#F2F0E9] rounded-lg flex items-center justify-center border border-border shrink-0">
                  <MapPin className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-text uppercase tracking-widest mb-1">Location</h3>
                  <p className="text-text2">San Francisco, CA</p>
                </div>
              </div>

              <div className="flex items-start gap-6">
                <div className="w-12 h-12 bg-[#F2F0E9] rounded-lg flex items-center justify-center border border-border shrink-0">
                  <Clock className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-text uppercase tracking-widest mb-1">Response Time</h3>
                  <p className="text-text2">Usually within 24-48 hours</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right Column: Form */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="lg:col-span-2"
          >
            <form onSubmit={handleSubmit} className="bg-white p-12 rounded-lg border border-border shadow-sm space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-text3 uppercase tracking-widest">First Name</label>
                  <input 
                    type="text" 
                    placeholder="John"
                    className="w-full px-4 py-3 bg-bg2 border border-border rounded focus:outline-none focus:border-accent transition-all"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-text3 uppercase tracking-widest">Last Name</label>
                  <input 
                    type="text" 
                    placeholder="Doe"
                    className="w-full px-4 py-3 bg-bg2 border border-border rounded focus:outline-none focus:border-accent transition-all"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-text3 uppercase tracking-widest">Email</label>
                <input 
                  type="email" 
                  placeholder="john@example.com"
                  className="w-full px-4 py-3 bg-bg2 border border-border rounded focus:outline-none focus:border-accent transition-all"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-text3 uppercase tracking-widest">Subject</label>
                <input 
                  type="text" 
                  placeholder="What's this about?"
                  className="w-full px-4 py-3 bg-bg2 border border-border rounded focus:outline-none focus:border-accent transition-all"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-text3 uppercase tracking-widest">Message</label>
                <textarea 
                  placeholder="Your message..."
                  rows={6}
                  className="w-full px-4 py-3 bg-bg2 border border-border rounded focus:outline-none focus:border-accent transition-all resize-none"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  required
                />
              </div>

              <button 
                type="submit"
                className="w-full py-4 bg-[#C8501E] text-white font-bold rounded hover:bg-[#B0451A] transition-all flex items-center justify-center gap-2 uppercase tracking-[2px] text-xs"
              >
                Send Message
                <Send className="w-4 h-4" />
              </button>
            </form>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

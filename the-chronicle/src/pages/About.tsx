import React from 'react';
import { motion } from 'motion/react';
import { Helmet } from 'react-helmet-async';
import { BookOpen } from 'lucide-react';

export const About: React.FC = () => {
  return (
    <div className="space-y-24 pb-24">
      <Helmet>
        <title>About Us | The Chronicle</title>
        <meta name="description" content="Learn more about The Chronicle, our story, mission, and why we write." />
      </Helmet>

      {/* Hero Section */}
      <section className="bg-[#F2F0E9] py-24 text-center border-b border-border">
        <div className="max-w-4xl mx-auto px-4 space-y-6">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-6xl font-serif font-bold text-text tracking-tight"
          >
            About Us
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-text3 text-lg font-medium"
          >
            Our story, our mission, our team.
          </motion.p>
        </div>
      </section>

      {/* Content Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="aspect-[4/3] bg-[#F2F0E9] rounded-lg flex items-center justify-center border border-border"
          >
            <div className="w-32 h-32 bg-white rounded-lg shadow-sm flex items-center justify-center border border-border">
              <BookOpen className="w-16 h-16 text-accent" />
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-12"
          >
            <div className="space-y-4">
              <h2 className="text-4xl font-serif font-bold text-text">Our Story</h2>
              <p className="text-text2 leading-relaxed text-lg">
                The Chronicle was founded in 2020 with a simple mission: to publish thoughtful, well-crafted articles that inform and inspire. We believe great writing can change perspectives and spark meaningful conversations.
              </p>
            </div>

            <div className="space-y-4">
              <h2 className="text-4xl font-serif font-bold text-text">Our Mission</h2>
              <p className="text-text2 leading-relaxed text-lg">
                We cover topics ranging from technology and design to culture, science, and the human experience. Every piece we publish is carefully edited and fact-checked to meet our high standards.
              </p>
            </div>

            <div className="space-y-4">
              <h2 className="text-4xl font-serif font-bold text-text">Why We Write</h2>
              <p className="text-text2 leading-relaxed text-lg">
                In a world of noise, we strive to be a signal. Our writers are experts in their fields, passionate storytellers, and curious humans who believe words matter.
              </p>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

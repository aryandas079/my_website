import React, { useState, useEffect } from 'react';
import Section from './components/Section';
import Card from './components/Card';
import { 
  HERO_DATA, 
  ABOUT_DATA, 
  EXPERTISE_DATA, 
  JOURNEY_DATA, 
  SKILLS_DATA, 
  CERTIFICATIONS_DATA,
  CONTACT_DATA
} from './constants';
import { ArrowRight, ExternalLink, Mail, MapPin, Linkedin, Sparkles, Instagram } from 'lucide-react';

const App: React.FC = () => {
  const [showWelcome, setShowWelcome] = useState(true);
  const emailContact = CONTACT_DATA.find(c => c.isEmail);
  const linkedInContact = CONTACT_DATA.find(c => c.title === "LinkedIn");

  useEffect(() => {
    // Disable scrolling when welcome screen is active
    if (showWelcome) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    // Hide welcome screen after 2.5 seconds
    const timer = setTimeout(() => {
      setShowWelcome(false);
    }, 2500);

    return () => clearTimeout(timer);
  }, [showWelcome]);

  return (
    <main className="min-h-screen font-sans text-custom-textMain bg-custom-bg selection:bg-custom-accent selection:text-black">
      
      {/* Welcome Animation Overlay */}
      <div 
        className={`fixed inset-0 z-50 flex items-center justify-center bg-black transition-opacity duration-1000 ease-in-out ${
          showWelcome ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'
        }`}
      >
        <div className="text-center animate-pulse">
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-4 tracking-tighter">
            {HERO_DATA.name}
          </h1>
          <div className="h-1 w-24 bg-custom-accent mx-auto rounded-full"></div>
          <p className="mt-4 text-custom-textMuted text-sm tracking-[0.3em] uppercase">
            Welcome
          </p>
        </div>
      </div>

      {/* Hero Section */}
      <div className="relative h-screen w-full flex items-center justify-center overflow-hidden">
        {/* Background Image with Overlay */}
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
          style={{ 
            backgroundImage: `url('${HERO_DATA.image}')`,
          }}
        >
          {/* Dark Fade Overlay - Reduced opacity so image is visible */}
          <div className="absolute inset-0 bg-black/50"></div>
          
          {/* Gradient Overlay for bottom fade */}
          <div className="absolute inset-0 bg-gradient-to-t from-custom-bg via-transparent to-transparent"></div>
        </div>

        {/* Hero Content */}
        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 text-white drop-shadow-lg">
            {HERO_DATA.name}
          </h1>
          <p className="text-lg md:text-xl text-gray-300 max-w-3xl mx-auto mb-10 leading-relaxed drop-shadow-md">
            {HERO_DATA.role}
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
             <a 
               href={emailContact ? `mailto:${emailContact.value}` : '#'}
               className="px-8 py-3 bg-custom-accent text-black font-semibold rounded-lg hover:bg-white transition-colors duration-300 inline-block"
             >
               Get In Touch
             </a>
             <a 
               href={linkedInContact?.link || '#'}
               target="_blank"
               rel="noopener noreferrer"
               className="px-8 py-3 bg-transparent border border-white/30 text-white font-semibold rounded-lg hover:bg-white/10 transition-colors duration-300 inline-block"
             >
               LinkedIn Profile
             </a>
          </div>
        </div>
      </div>

      {/* About Section */}
      <Section id="about">
        <h2 className="text-3xl md:text-4xl font-bold mb-12 text-white/90">
          {ABOUT_DATA.title}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
          <p className="text-lg text-custom-textMuted leading-relaxed">
            {ABOUT_DATA.description}
          </p>
          <div className="bg-custom-card/50 p-8 rounded-2xl border border-custom-border">
            <h3 className="text-xl font-semibold mb-6 text-white">Core Focus</h3>
            <ul className="space-y-4">
              {ABOUT_DATA.coreFocus.map((item, index) => (
                <li key={index} className="flex items-start gap-3 text-custom-textMuted">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-custom-accent shrink-0"></span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      {/* Expertise Section */}
      <Section id="expertise" className="bg-black/20">
        <h2 className="text-3xl md:text-4xl font-bold mb-12 text-white/90">
          Technical Expertise
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {EXPERTISE_DATA.map((item, index) => (
            <Card key={index} className="group">
              <div className="mb-4 inline-flex p-3 rounded-lg bg-custom-accent/10 text-custom-accent group-hover:scale-110 transition-transform duration-300">
                <item.icon className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-white">{item.title}</h3>
              <p className="text-custom-textMuted leading-relaxed">
                {item.description}
              </p>
            </Card>
          ))}
        </div>
      </Section>

      {/* Academic Journey Section */}
      <Section id="journey">
        <h2 className="text-3xl md:text-4xl font-bold mb-12 text-white/90">
          Academic Journey
        </h2>
        <div className="relative space-y-8 pl-4 sm:pl-0">
          {/* Vertical Line */}
          <div className="absolute left-8 sm:left-1/2 top-4 bottom-4 w-px bg-custom-border transform -translate-x-1/2 hidden sm:block"></div>

          {JOURNEY_DATA.map((item, index) => (
            <div key={index} className={`relative flex flex-col sm:flex-row items-center sm:items-start gap-8 ${index % 2 === 0 ? 'sm:flex-row-reverse' : ''}`}>
              
              {/* Timeline Number */}
              <div className="absolute left-8 sm:left-1/2 top-0 w-10 h-10 bg-custom-card border border-custom-border text-custom-accent font-bold rounded-full flex items-center justify-center transform -translate-x-1/2 z-10 shadow-xl">
                {index + 1}
              </div>

              {/* Content Card */}
              <div className="w-full sm:w-[calc(50%-2rem)]">
                <Card className={`h-full ${index % 2 === 0 ? 'text-left' : 'text-left'}`}>
                  <div className="flex flex-col gap-1 mb-2">
                    <span className="text-custom-accent font-semibold">{item.institution}</span>
                    <span className="text-sm text-custom-textMuted">{item.period}</span>
                  </div>
                  <h3 className="text-xl font-bold mb-2 text-white">{item.degree}</h3>
                  <p className="text-custom-textMuted text-sm leading-relaxed">
                    {item.description}
                  </p>
                </Card>
              </div>
              
              {/* Spacer for the other side */}
              <div className="hidden sm:block w-[calc(50%-2rem)]"></div>
            </div>
          ))}
        </div>
      </Section>

      {/* Skills & Certifications Section */}
      <Section id="skills" className="bg-black/20">
        <h2 className="text-3xl md:text-4xl font-bold mb-12 text-white/90">
          Skills & Certifications
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          
          {/* Professional Skills */}
          <div>
            <h3 className="text-2xl font-semibold mb-6 text-white/80">Professional Skills</h3>
            <div className="space-y-4">
              {SKILLS_DATA.map((skill, index) => (
                <Card key={index} className="border-l-4 border-l-custom-accent">
                  <h4 className="font-bold text-lg mb-1 text-white">{skill.title}</h4>
                  <p className="text-custom-textMuted text-sm whitespace-pre-line">{skill.description}</p>
                </Card>
              ))}
            </div>
          </div>

          {/* Certifications */}
          <div>
            <h3 className="text-2xl font-semibold mb-6 text-white/80">Certifications</h3>
            <div className="space-y-4">
              {CERTIFICATIONS_DATA.map((cert, index) => (
                <div key={index} className="bg-transparent p-6 border-b border-custom-border hover:bg-white/5 transition-colors rounded-lg">
                  <h4 className="font-bold text-lg mb-2 text-white">{cert.title}</h4>
                  <p className="text-custom-textMuted text-sm">{cert.issuer}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </Section>

      {/* Let's Connect Section */}
      <Section id="contact" className="pb-32">
        <h2 className="text-3xl md:text-4xl font-bold mb-4 text-custom-accent/90">
          Let's Connect
        </h2>
        <h3 className="text-xl text-white/80 mb-8">
          Open to Collaboration
        </h3>
        <p className="text-custom-textMuted max-w-2xl mb-12 text-lg">
          Always eager to connect with peers, mentors, and innovators. Share a love for learning and innovation, building meaningful tech solutions together.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {CONTACT_DATA.map((contact, index) => (
            <div key={index} className="bg-[#EAE8E4] p-6 rounded-lg text-black">
              <h4 className="text-lg font-bold mb-3">{contact.title}</h4>
              <div className="flex items-center gap-2">
                {contact.isEmail ? (
                   <a href={`mailto:${contact.value}`} className="font-medium underline hover:text-custom-accent/80 transition-colors break-all">
                     {contact.value}
                   </a>
                ) : contact.link ? (
                   <a href={contact.link} target="_blank" rel="noopener noreferrer" className="font-medium underline hover:text-custom-accent/80 transition-colors">
                     {contact.value}
                   </a>
                ) : (
                  <span className="font-medium">{contact.value}</span>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-4">
           {/* Only one button as requested, linking to Instagram */}
           <a 
             href="https://instagram.com/iam_aryandas" 
             target="_blank" 
             rel="noopener noreferrer"
             className="bg-transparent border border-custom-border text-white font-bold py-3 px-8 rounded-lg hover:bg-white/10 hover:border-custom-accent/50 hover:text-custom-accent transition-all duration-300 flex items-center gap-2"
           >
             <Instagram className="w-5 h-5" />
             Connect on Instagram
           </a>
        </div>
      </Section>
      
      {/* Simple Footer */}
      <footer className="py-8 border-t border-custom-border text-center text-custom-textMuted text-sm bg-black">
        <p>© {new Date().getFullYear()} Aryan Das. All rights reserved.</p>
      </footer>
    </main>
  );
};

export default App;
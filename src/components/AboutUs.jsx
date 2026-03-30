import React from 'react';
import './AboutUs.css';
import member1Img from '../assets/team/Designer.png';
import member2Img from '../assets/team/developer.png';
import member3Img from '../assets/team/documentationSpecialist.png';
import member4Img from '../assets/team/QualityAssurance.png';
import member5Img from '../assets/team/SystemAnalyst.png';
import member6Img from '../assets/team/ProjectManager.png';

const AboutUs = () => {
  const teamMembers = [
    {
      name: "Jigie Caitom", // Replace with actual name
      role: "Project Manager",
      bio: "Strategizes project timelines and resource allocation, ensuring that Access Log meets all security and administrative requirements.",
      image: member6Img
    },
    {
      name: "Michelle A. Cajes", // Replace with actual name
      role: "System Analyst",
      bio: "Analyzes organizational data flows to optimize how the system handles high-volume traffic in libraries and corporate offices.",
      image: member5Img
    },
    {
      name: "Steven Cajes",
      role: "Developer",
      bio: "Lead architect of the Access Log ecosystem. Responsible for full-stack React integration, Firebase real-time logic, and IoT hardware communication.",
      image: member2Img
    },
    {
      name: "Marianne T. Gavas", // Replace with actual name
      role: "Designer (UI/UX)",
      bio: "Focused on creating a high-end, professional interface that simplifies complex attendance reporting for administrators.",
      image: member1Img
    },
    {
      name: "Stephanie Garay", // Replace with actual name
      role: "Quality Assurance (QA)",
      bio: "Ensures 100% reliability of the RFID scanning process and system stability across various network environments and hardware setups.",
      image: member4Img
    },
    {
      name: "Raechelle Anne B. Cajes", // Replace with actual name
      role: "Documentation Specialist",
      bio: "Author of the technical framework and user manuals, ensuring the system's architecture and logic are clearly defined for future scaling.",
      image: member3Img
    }
  ];

  return (
    <div className="about-container">
      <div className="about-glass-card">
        <header className="about-header">
          <span className="project-tag">Enterprise Access Solutions</span>
          <h1>About Access Log</h1>
          <p className="subtitle">Precision attendance and security tracking for modern institutions.</p>
        </header>

        <section className="vision-grid">
          <div className="vision-item">
            <h3>Versatile Implementation</h3>
            <p><strong>Access Log</strong> is a modular attendance management system designed for versatility. From <strong>corporate headquarters</strong> and <strong>public libraries</strong> to <strong>specialized laboratories</strong>, our system adapts to any environment requiring secure, real-time logging.</p>
          </div>
          <div className="vision-item">
            <h3>Advanced IoT Architecture</h3>
            <p>Leveraging high-frequency RFID technology and cloud-based synchronization, we provide a seamless bridge between physical security and digital data intelligence, allowing for instant occupancy monitoring and detailed reporting.</p>
          </div>
        </section>

        <section className="team-section">
          <h2 className="section-title">The Development Team</h2>
          <div className="team-grid">
            {teamMembers.map((member, index) => (
              <div key={index} className="member-card">
                <div className="image-wrapper">
                  <img src={member.image} alt={member.name} />
                </div>
                <span className="role-badge">{member.role}</span>
                <h3>{member.name}</h3>
                <p>{member.bio}</p>
              </div>
            ))}
          </div>
        </section>

        <footer className="about-footer">
          <p>© 2026 Access Log Development Group. All Rights Reserved.</p>
        </footer>
      </div>
    </div>
  );
};

export default AboutUs;
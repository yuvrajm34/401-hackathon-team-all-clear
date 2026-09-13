import { parseResumeText } from "./src/lib/resume-parse";

const text = `Hayden Lee
hayden@mit.edu
123-456-7890

EDUCATION
Massachusetts Institute of Technology                          Cambridge, MA
Candidate for B.S. Architecture, GPA 4.5/5.0                        June 20XX

RELEVANT PROJECT EXPERIENCE
Back Bay Children's Mediathèque                             February - May 20XX
Skills: Rhino3D, Grasshopper for Rhino3D, VRay, Adobe Illustrator, Adobe Photoshop
Conceptualized a children's mediathèque based on field conditions across time

WORK EXPERIENCE
Robotics Company                                                  January 20XX
Education Design Intern
Designed interactive models with Rhino3D concurrent with Common Core standards for the enhancement of education in local schools and wrote corresponding lesson plans

Studio                                                      June - August 20XX
Design Intern
Researched, designed, and co-wrote a manifesto with bioengineering Johns Hopkins student as a feature for the studio website using HTML/CSS with Bootstrap
`;

const parsed = parseResumeText(text);
console.log("EDUCATION:", JSON.stringify(parsed.education, null, 2));
console.log("EXPERIENCE:", JSON.stringify(parsed.experience, null, 2));
console.log("PROJECTS:", JSON.stringify(parsed.projects, null, 2));

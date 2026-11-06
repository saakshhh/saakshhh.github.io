# Beyond Reshoring: References and Figure Notes

**The Role of AI and Predictive Analytics in Semiconductor Supply Chain Resilience**

**Researcher:** Saksham Singh, Purdue University, Department of Computer Science  
**Faculty mentor:** Harris J. Bras  
**Presentation:** Purdue Fall Undergraduate Research Expo, November 17, 2026

This page supplies the complete citations, source links, and numerical definitions for the research poster. It is a literature review and comparative synthesis, **not** an original causal experiment. Forecasts and network simulations are labeled separately from observed facts.

## Visual 1: U.S. manufacturing capacity (industry forecasts)

The 2024 Semiconductor Industry Association (SIA) / Boston Consulting Group (BCG) report estimates:

| Measure | 2022 actual / baseline | 2032 forecast |
| --- | ---: | ---: |
| U.S. share of global wafer fabrication capacity | 10% | 14% |
| U.S. share of global advanced logic fabrication capacity (<10 nm) | 0% | 28% |

These are **distinct measures** of fabrication capacity; percentages are not shares of semiconductor sales or R&D. The 2032 values are **forecasts made in 2024, not observed outcomes**. Source: SIA & BCG (2024), [Emerging Resilience in the Semiconductor Supply Chain](https://www.semiconductors.org/emerging-resilience-in-the-semiconductor-supply-chain/), and [SIA May 8, 2024 release](https://www.semiconductors.org/america-projected-to-triple-semiconductor-manufacturing-capacity-by-2032-the-largest-rate-of-growth-in-the-world/).

## Visual 2: Trade-network collapse under simulated disruptions

Li et al. (2025), Table 6, examine a CEPII-based **2021 trade network** and report how many countries/territories (network nodes) need removal to reach a simulated collapse, defined as **less than 10% of the original trade volume remaining**.

| Trade-network segment | Original nodes | Removed to collapse: random | Removed to collapse: targeted | Share removed: random | Share removed: targeted |
| --- | ---: | ---: | ---: | ---: | ---: |
| Raw materials | 58 | 39 | 6 | 67.2% | 10.3% |
| Equipment | 48 | 33 | 6 | 68.8% | 12.5% |
| Finished components | 96 | 67 | 9 | 69.8% | 9.4% |

*Percentages shown in the poster were calculated as nodes removed divided by total nodes, rounded to whole percentages. Targeted removal follows highest strength-centrality nodes. These simulated network results do **not** measure actual future losses or give a probability of real-world disruption.* Source: Li et al. (2025), [full paper and Table 6](https://pmc.ncbi.nlm.nih.gov/articles/PMC11717270/).

## Research sources (APA 7)

Kamakura, N. (2022). From globalising to regionalising to reshoring value chains? The case of Japan’s semiconductor industry. *Cambridge Journal of Regions, Economy and Society, 15*(2), 261–277. https://doi.org/10.1093/cjres/rsac010

Li, L., Wang, H., Li, Z., & Hu, S. (2025). Analysis of the structure and robustness of the global semiconductor trade network. *PLOS ONE, 20*(1), Article e0313162. https://doi.org/10.1371/journal.pone.0313162

Li, Y., Lin, F., Yang, K., & Zhang, Q. (2026). “Friend-shoring” and global supply chains: Empirical evidence from the semiconductor industry. *China Economic Review, 99*, Article 102742. https://doi.org/10.1016/j.chieco.2026.102742

Liu, R. C., Tang, H., Kao, Y., & Chou, Y. (2025). From vulnerabilities to resilience: Taiwan’s semiconductor industry and geopolitical challenges. *Telecommunications Policy, 49*(4), Article 102951. https://doi.org/10.1016/j.telpol.2025.102951

Moktadir, M. A., & Ren, J. (2024). Global semiconductor supply chain resilience challenges and mitigation strategies: A novel integrated decomposed fuzzy set Delphi, WINGS and QFD model. *International Journal of Production Economics, 273*, Article 109280. https://doi.org/10.1016/j.ijpe.2024.109280

Ramani, V., Ghosh, D., & Sodhi, M. S. (2022). Understanding systemic disruption from the COVID-19-induced semiconductor shortage for the auto industry. *Omega, 113*, Article 102720. https://doi.org/10.1016/j.omega.2022.102720

Ramirez, Z. R., & Le, T. V. (2025). Semiconductor supply chain resilience: Systematic review, conceptual framework, implementation challenges, and future research directions. *Computers & Industrial Engineering, 210*, Article 111518. https://doi.org/10.1016/j.cie.2025.111518

Smyth, C., Dennehy, D., Fosso Wamba, S., Scott, M., & Harfouche, A. (2024). Artificial intelligence and prescriptive analytics for supply chain resilience: A systematic literature review and research agenda. *International Journal of Production Research, 62*(23), 8537–8561. https://doi.org/10.1080/00207543.2024.2341415

U.S. Government Accountability Office. (2026, August 6). *Semiconductors: Commerce needs plan to meet CHIPS for America R&D requirements* (GAO-26-109121). https://www.gao.gov/products/gao-26-109121

Varadarajan, R., Koch-Weser, I., Richard, C., Fitzgerald, J., Singh, J., Thornton, M., & Casanova, R. (2024, May 8). *Emerging resilience in the semiconductor supply chain*. Boston Consulting Group. https://www.bcg.com/publications/2024/emerging-resilience-in-semiconductor-supply-chain

Xiong, W., Wu, D. D., & Yeung, J. H. Y. (2025). Semiconductor supply chain resilience and disruption: Insights, mitigation, and future directions. *International Journal of Production Research, 63*(9), 3442–3465. https://doi.org/10.1080/00207543.2024.2387074

Zamani, E. D., Smyth, C., Gupta, S., & Dennehy, D. (2023). Artificial intelligence and big data analytics for supply chain resilience: A systematic literature review. *Annals of Operations Research, 327*(2), 605–632. https://doi.org/10.1007/s10479-022-04983-y

---

**Interpretive note:** This poster compares proposed responses and published evidence; it does not establish that any specific mix of strategies causes a measured increase in semiconductor supply-chain resilience.

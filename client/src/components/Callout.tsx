import { Link } from 'react-router-dom';
import parse from 'html-react-parser';

interface CalloutProps {
    title: string,
    content: string | number | Date,
    units?: string,
    link?: string,
    styles?: string,
}

export const Callout: React.FC<CalloutProps> = ({
    title,
    link,
    content,
    units,
    styles
}) => {
    return (
        <div className={styles}>
            <span className="text-muted text-sm uppercase">{title}</span>
            <div>
                {link
                    ? (
                        <Link to={link}>
                            <span className="font-light">{content}</span>
                        </Link>
                    )
                    : (
                        <span className="font-light">
                            {typeof content === 'string'
                                ? (parse(content))
                                : (content)
                            }
                        </span>
                    )
                }
                {units &&
                    <span>{units}</span>
                }
            </div>
        </div>
    )
};
